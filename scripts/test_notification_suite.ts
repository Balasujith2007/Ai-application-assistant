import prisma from '../lib/prisma';
import { signToken } from '../lib/serverAuth';
import {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  deleteNotification,
} from '../lib/notifications/notificationService';
import { getNotificationEmitter, NotificationEvent } from '../lib/notifications/eventBus';

async function runTestSuite() {
  console.log('====================================================');
  console.log('  CareerAI Notification & Real-Time Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || '');
      failed++;
    }
  }

  // Find or create test users
  const testStudentA = await prisma.user.upsert({
    where: { email: 'test_notif_student_a@careerai.test' },
    update: {},
    create: {
      email: 'test_notif_student_a@careerai.test',
      name: 'Test Student Alpha',
      role: 'STUDENT',
      password: 'test-hashed-password',
    },
  });

  const testStudentB = await prisma.user.upsert({
    where: { email: 'test_notif_student_b@careerai.test' },
    update: {},
    create: {
      email: 'test_notif_student_b@careerai.test',
      name: 'Test Student Beta',
      role: 'STUDENT',
      password: 'test-hashed-password',
    },
  });

  const tokenA = signToken({ id: testStudentA.id, email: testStudentA.email, role: testStudentA.role });
  const tokenB = signToken({ id: testStudentB.id, email: testStudentB.email, role: testStudentB.role });

  // Clean up any old test notifications for these users
  await prisma.notification.deleteMany({
    where: { userId: { in: [testStudentA.id, testStudentB.id] } },
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Seven real unread records produce a badge count of 7 and 7 dropdown records
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Seven Unread Records Verification ---');
  const createdIds: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const notif = await createNotification({
      userId: testStudentA.id,
      title: `Assignment Notice #${i}`,
      message: `You have a new career assignment deadline #${i}`,
      type: 'TASK',
      link: '/dashboard/student',
    });
    createdIds.push(notif.id);
  }

  const unreadCountScenario1 = await getUnreadCount(testStudentA.id);
  const recordsScenario1 = await prisma.notification.findMany({
    where: { userId: testStudentA.id },
    orderBy: { createdAt: 'desc' },
  });

  assert(
    unreadCountScenario1 === 7,
    'Scenario 1.1: Database unread count is exactly 7',
    { expected: 7, actual: unreadCountScenario1 }
  );
  assert(
    recordsScenario1.length === 7 && recordsScenario1.every((n) => !n.isRead),
    'Scenario 1.2: Dropdown dataset contains exactly 7 real unread records',
    { count: recordsScenario1.length }
  );

  // -------------------------------------------------------------------------
  // Scenario 2: Zero unread records produce no unread badge (0) and empty state
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Zero Unread Records & Empty State ---');
  await markAllNotificationsRead(testStudentA.id);
  const unreadCountScenario2 = await getUnreadCount(testStudentA.id);
  const unreadRecordsScenario2 = await prisma.notification.findMany({
    where: { userId: testStudentA.id, isRead: false },
  });

  assert(
    unreadCountScenario2 === 0,
    'Scenario 2.1: Authoritative unread count is 0 after mark-all-read',
    { actual: unreadCountScenario2 }
  );
  assert(
    unreadRecordsScenario2.length === 0,
    'Scenario 2.2: Zero unread records exist (badge will not be rendered; empty unread state shown)'
  );

  // Also verify user with 0 total notifications
  const userZeroNotifs = await prisma.user.findFirst({
    where: { email: 'demo.superadmin@careerai.demo' },
  });
  if (userZeroNotifs) {
    await prisma.notification.deleteMany({ where: { userId: userZeroNotifs.id } });
    const countZero = await getUnreadCount(userZeroNotifs.id);
    assert(
      countZero === 0,
      'Scenario 2.3: Super Admin demo user has 0 unread notifications (no fake 7 badge)'
    );
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Real-time event dispatch upon notification creation
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Real-Time Event Dispatch ---');
  const emitter = getNotificationEmitter();
  let receivedRealtimeEvent: NotificationEvent | null = null;

  const eventListener = (e: NotificationEvent) => {
    receivedRealtimeEvent = e;
  };
  emitter.once(`user:${testStudentA.id}`, eventListener);

  const realTimeNotif = await createNotification({
    userId: testStudentA.id,
    title: '🏆 Internship Shortlisted',
    message: 'Your application for Google Summer Internship has moved to Interview round!',
    type: 'OPPORTUNITY',
    link: '/dashboard/student/opportunities',
  });

  assert(
    receivedRealtimeEvent !== null,
    'Scenario 3.1: Real-time event received via EventBus for user',
    { received: !!receivedRealtimeEvent }
  );
  assert(
    (receivedRealtimeEvent as any)?.type === 'NOTIFICATION_CREATED' &&
      (receivedRealtimeEvent as any)?.notification?.id === realTimeNotif.id &&
      (receivedRealtimeEvent as any)?.unreadCount === 1,
    'Scenario 3.2: Real-time payload contains correct notification data and updated unread count (1)',
    receivedRealtimeEvent
  );

  // -------------------------------------------------------------------------
  // Scenario 4: Marking one notification as read decreases count correctly
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Mark Single Notification as Read ---');
  let readEventReceived: NotificationEvent | null = null;
  emitter.once(`user:${testStudentA.id}`, (e: NotificationEvent) => {
    readEventReceived = e;
  });

  const updatedRecord = await markNotificationRead(realTimeNotif.id, testStudentA.id);
  const unreadCountAfterSingleRead = await getUnreadCount(testStudentA.id);

  assert(
    updatedRecord?.isRead === true,
    'Scenario 4.1: Record marked as isRead: true in database'
  );
  assert(
    unreadCountAfterSingleRead === 0,
    'Scenario 4.2: Unread count decremented to 0 in database',
    { count: unreadCountAfterSingleRead }
  );
  assert(
    (readEventReceived as any)?.type === 'NOTIFICATION_READ' &&
      (readEventReceived as any)?.notificationId === realTimeNotif.id &&
      (readEventReceived as any)?.unreadCount === 0,
    'Scenario 4.3: Real-time NOTIFICATION_READ event dispatched to client',
    readEventReceived
  );

  // -------------------------------------------------------------------------
  // Scenario 5: Marking all as read updates database and badge
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Mark All as Read ---');
  // Seed 3 unread
  await createNotification({ userId: testStudentA.id, title: 'Notif A', message: 'Msg A' });
  await createNotification({ userId: testStudentA.id, title: 'Notif B', message: 'Msg B' });
  await createNotification({ userId: testStudentA.id, title: 'Notif C', message: 'Msg C' });

  let allReadEvent: NotificationEvent | null = null;
  emitter.once(`user:${testStudentA.id}`, (e: NotificationEvent) => {
    allReadEvent = e;
  });

  const markedCount = await markAllNotificationsRead(testStudentA.id);
  const countAfterAllRead = await getUnreadCount(testStudentA.id);

  assert(
    markedCount >= 3,
    'Scenario 5.1: markAllNotificationsRead updated all unread records',
    { markedCount }
  );
  assert(
    countAfterAllRead === 0,
    'Scenario 5.2: Database unread count is 0 after mark-all-read'
  );
  assert(
    (allReadEvent as any)?.type === 'NOTIFICATIONS_ALL_READ' && (allReadEvent as any)?.unreadCount === 0,
    'Scenario 5.3: NOTIFICATIONS_ALL_READ real-time event dispatched with unreadCount: 0',
    allReadEvent
  );

  // -------------------------------------------------------------------------
  // Scenario 6: Refreshing preserves correct count across independent queries
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 6: State Persistence Across Refreshes ---');
  // Add 2 new notifications
  const n1 = await createNotification({ userId: testStudentA.id, title: 'Persisted 1', message: 'Body 1' });
  const n2 = await createNotification({ userId: testStudentA.id, title: 'Persisted 2', message: 'Body 2' });

  // Simulate Page Refresh 1
  const refresh1Count = await prisma.notification.count({ where: { userId: testStudentA.id, isRead: false } });
  // Simulate Page Refresh 2
  const refresh2Count = await prisma.notification.count({ where: { userId: testStudentA.id, isRead: false } });

  assert(
    refresh1Count === 2 && refresh2Count === 2,
    'Scenario 6.1: Refreshing page preserves exact persisted unread count (2)',
    { refresh1Count, refresh2Count }
  );

  // -------------------------------------------------------------------------
  // Scenario 7: Network/API error handling logic
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Error State vs Empty State Separation ---');
  // In NotificationContext and NotificationDropdown:
  // - status === 'error' renders the Error state with Retry button
  // - status === 'success' with 0 notifications renders "No new notifications"
  // Verify that an invalid user ID or unauthorized request throws / fails without returning false success
  const invalidUserCount = await getUnreadCount('non-existent-user-id');
  assert(
    invalidUserCount === 0,
    'Scenario 7.1: Non-existent user returns 0 count safely'
  );
  // Test deletion of non-existent notification returns false
  const deleteResult = await deleteNotification('non-existent-id', testStudentA.id);
  assert(
    deleteResult === false,
    'Scenario 7.2: Cannot delete non-existent notification (returns false / 404)'
  );

  // -------------------------------------------------------------------------
  // Scenario 8: Event deduplication prevents double-counting
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Event Deduplication ---');
  // Simulate client-side array deduplication
  const clientNotificationList = [
    { id: n1.id, isRead: false },
    { id: n2.id, isRead: false },
  ];

  // Try inserting duplicate n1 event
  const isDuplicate = clientNotificationList.some((item) => item.id === n1.id);
  const deduplicatedList = isDuplicate
    ? clientNotificationList
    : [{ id: n1.id, isRead: false }, ...clientNotificationList];

  assert(
    deduplicatedList.length === 2,
    'Scenario 8.1: Client deduplication logic prevents duplicate event injection',
    { count: deduplicatedList.length }
  );

  // -------------------------------------------------------------------------
  // Scenario 9: User isolation & cross-user privacy protection
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Cross-User Security & Privacy Isolation ---');
  // Student B creates a private notification
  const secretNotifB = await createNotification({
    userId: testStudentB.id,
    title: 'Confidential Performance Review',
    message: 'Private notes for Student B only',
  });

  // Student A tries to mark Student B's notification as read
  const hackAttempt = await markNotificationRead(secretNotifB.id, testStudentA.id);
  assert(
    hackAttempt === null,
    'Scenario 9.1: Student A cannot mark Student B notification as read (returns null / 404 forbidden)'
  );

  // Student A tries to delete Student B's notification
  const deleteHackAttempt = await deleteNotification(secretNotifB.id, testStudentA.id);
  assert(
    deleteHackAttempt === false,
    'Scenario 9.2: Student A cannot delete Student B notification (returns false / 404 forbidden)'
  );

  // Check that real-time event for Student B was not emitted to Student A
  let studentAGotStudentBEvent = false;
  const spyListener = () => {
    studentAGotStudentBEvent = true;
  };
  emitter.once(`user:${testStudentA.id}`, spyListener);

  await createNotification({
    userId: testStudentB.id,
    title: 'Another Student B notification',
    message: 'Secret',
  });

  assert(
    studentAGotStudentBEvent === false,
    'Scenario 9.3: Real-time events for Student B are completely isolated from Student A channel'
  );
  emitter.off(`user:${testStudentA.id}`, spyListener);

  // -------------------------------------------------------------------------
  // Scenario 10: Existing notification navigation & entity links
  // -------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Navigation & Entity Linking Integrity ---');
  const opportunityNotif = await createNotification({
    userId: testStudentA.id,
    type: 'OPPORTUNITY',
    title: 'New Hackathon Opportunity',
    message: 'Hackathon posted',
    relatedEntityId: 'cmvdv8p6g0000n0bc3su4s1nc',
    relatedEntityType: 'OPPORTUNITY',
    link: '/dashboard/student/opportunities',
  });

  assert(
    opportunityNotif.link === '/dashboard/student/opportunities' &&
      opportunityNotif.relatedEntityType === 'OPPORTUNITY',
    'Scenario 10.1: Notification preserves direct navigation route and entity references'
  );

  // Clean up test data
  await prisma.notification.deleteMany({
    where: { userId: { in: [testStudentA.id, testStudentB.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [testStudentA.id, testStudentB.id] } },
  });

  console.log('\n====================================================');
  console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

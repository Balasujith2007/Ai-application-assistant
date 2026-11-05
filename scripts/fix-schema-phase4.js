const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Remove the misplaced shop fields from User model (between dailyCheckIns and studentRewards)
// These fields don't belong on User model
const misplacedBlock = `  dailyCheckIns          DailyCheckIn[]\r\n  // Shop item configuration\r\n  isShopItem        Boolean          @default(false)\r\n  coinPrice         Int?\r\n  shopCategory      String?          // FRAME, TITLE, BADGE, SHOWCASE\r\n  purchaseLimit     Int?             @default(1)\r\n\r\n  studentRewards    StudentReward[]\r\n  shopPurchases     ShopPurchase[]`;

const fixedBlock = `  dailyCheckIns          DailyCheckIn[]\r\n\r\n  studentRewards    StudentReward[]\r\n  shopPurchases     ShopPurchase[]`;

if (content.includes(misplacedBlock)) {
  content = content.replace(misplacedBlock, fixedBlock);
  console.log('✅ Removed misplaced shop fields from User model');
} else {
  console.log('⚠️  Misplaced block not found verbatim, trying line-by-line approach...');
  
  // Try alternative removal of just the duplicate shopPurchases line
  // The duplicate is specifically the one with extra spaces before it
  const dupLine = `  shopPurchases          ShopPurchase[]\r\n`;
  const count = (content.match(/shopPurchases/g) || []).length;
  console.log(`Found ${count} occurrences of 'shopPurchases' in schema`);
  
  // Remove the specifically indented duplicate (extra spaces version on line 166)
  content = content.replace(/  shopPurchases\s{10,}ShopPurchase\[\]\r?\n/, '');
  
  // Also remove misplaced shop config fields if they're on the User model
  content = content.replace(/  \/\/ Shop item configuration\r?\n  isShopItem\s+Boolean\s+@default\(false\)\r?\n  coinPrice\s+Int\?\r?\n  shopCategory\s+String\?\s+\/\/ FRAME, TITLE, BADGE, SHOWCASE\r?\n  purchaseLimit\s+Int\?\s+@default\(1\)\r?\n\r?\n/, '');
  
  console.log('✅ Applied alternative fix');
}

// 2. Add shop fields to RewardDefinition model (before its studentRewards relation)
const rewardDefRelations = `  studentRewards    StudentReward[]\r\n\r\n  @@index([rewardType, rewardRarity])`;
const rewardDefRelationsWithShop = `  // Shop configuration\r\n  isShopItem        Boolean          @default(false)\r\n  coinPrice         Int?             // Cost in coins to purchase from shop\r\n  shopCategory      String?          // FRAME, TITLE, BADGE, SHOWCASE\r\n  purchaseLimit     Int?             @default(1) // Max purchases per student (null = unlimited)\r\n\r\n  studentRewards    StudentReward[]\r\n  shopPurchases     ShopPurchase[]\r\n\r\n  @@index([rewardType, rewardRarity])`;

if (content.includes(rewardDefRelations)) {
  if (!content.includes('isShopItem') || content.indexOf('isShopItem') > content.indexOf('model RewardDefinition')) {
    content = content.replace(rewardDefRelations, rewardDefRelationsWithShop);
    console.log('✅ Added shop fields to RewardDefinition model');
  } else {
    console.log('ℹ️  RewardDefinition already has shop fields — skipping');
  }
} else {
  console.log('⚠️  RewardDefinition relations block not found verbatim');
  // Check if shopPurchases is already in RewardDefinition  
  const rdIdx = content.indexOf('model RewardDefinition');
  const rdEnd = content.indexOf('}', rdIdx);
  const rdSection = content.substring(rdIdx, rdEnd);
  if (!rdSection.includes('isShopItem')) {
    // Insert before closing brace of RewardDefinition
    const marker = '  @@index([rewardType, rewardRarity])\r\n  @@index([enabled])\r\n  @@map("reward_definitions")\r\n}';
    const markerReplacement = `  // Shop configuration\r\n  isShopItem        Boolean          @default(false)\r\n  coinPrice         Int?             // Cost in coins to purchase from shop\r\n  shopCategory      String?          // FRAME, TITLE, BADGE, SHOWCASE\r\n  purchaseLimit     Int?             @default(1) // Max purchases per student\r\n\r\n  shopPurchases     ShopPurchase[]\r\n\r\n  @@index([rewardType, rewardRarity])\r\n  @@index([enabled])\r\n  @@map("reward_definitions")\r\n}`;
    content = content.replace(marker, markerReplacement);
    console.log('✅ Added shop fields to RewardDefinition via alternative method');
  }
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('✅ Schema written successfully');

// Verify no duplicates
const shopPurchasesCount = (content.match(/shopPurchases/g) || []).length;
const isShopItemCount = (content.match(/isShopItem/g) || []).length;
console.log(`\nVerification:`);
console.log(`  shopPurchases occurrences: ${shopPurchasesCount} (expected: 4 — User field, RewardDef field, ShopPurchase.student relation, ShopPurchase.rewardDef relation)`);
console.log(`  isShopItem occurrences: ${isShopItemCount} (expected: 1 on RewardDefinition)`);


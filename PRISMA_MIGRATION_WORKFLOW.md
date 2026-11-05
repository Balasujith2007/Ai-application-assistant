# Prisma Migration Workflow - Production Safety Guide

## Current State Assessment

**Database:** PostgreSQL (Neon)  
**Current Method:** `prisma db push` (NOT migration-managed)  
**Status:** ⚠️ Database is not managed by Prisma Migrate  
**Models:** 59 models introspected from database  
**Risk:** HIGH - No version-controlled migration history

## CRITICAL PRODUCTION SAFETY RULES

❌ **DO NOT:**
- Run `prisma migrate dev` against production database
- Run `prisma db push` against production database
- Reset or drop production database
- Generate migrations against live production data
- Run migrations without full backup
- Apply untested migrations to production

✅ **DO:**
- Test all migrations against staging/dev database first
- Create full database backup before any production migration
- Use `prisma migrate diff` to review changes before applying
- Baseline production database with migration history
- Maintain migration rollback plan
- Document all migration procedures

## Recommended Migration Workflow

### Phase 1: Staging Environment Setup

1. **Create Staging Database**
   ```bash
   # Clone production schema to staging
   # Use pg_dump or neon equivalent
   ```

2. **Baseline Staging Database**
   ```bash
   npx prisma migrate resolve --applied "0_init"
   ```

3. **Test Migration Workflow on Staging**
   - Make schema changes
   - Create migration: `npx prisma migrate dev --name <change>`
   - Review generated SQL
   - Test application against staging
   - Verify data integrity

### Phase 2: Production Baseline (When Safe)

**WARNING:** Only proceed when:
- Staging migration workflow is verified
- Full production backup is created
- Maintenance window is scheduled
- Rollback plan is documented and tested

**Production Baseline Procedure:**

1. **Create Full Backup**
   ```bash
   # PostgreSQL backup
   pg_dump -Fc production_db > backup_$(date +%Y%m%d_%H%M%S).dump
   ```

2. **Create Initial Migration File**
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
   ```

3. **Mark Migration as Applied**
   ```bash
   npx prisma migrate resolve --applied "0_init"
   ```

4. **Verify Baseline**
   ```bash
   npx prisma migrate status
   # Should show: "The current database is managed by Prisma Migrate"
   ```

### Phase 3: Future Schema Changes

**Development:**
```bash
npx prisma migrate dev --name <descriptive_name>
```

**Staging Testing:**
```bash
npx prisma migrate deploy
```

**Production Deployment:**
```bash
# 1. Create backup
# 2. Deploy application with new migration
# 3. Run: npx prisma migrate deploy
# 4. Verify application health
# 5. Monitor for issues
```

## Migration Review Checklist

Before applying any migration to production:

- [ ] Migration tested on staging
- [ ] Full production backup created
- [ ] Migration SQL reviewed manually
- [ ] Data migration scripts tested
- [ ] Rollback procedure documented
- [ ] Application code changes deployed
- [ ] Maintenance window scheduled
- [ ] On-call engineer available
- [ ] Monitoring/alerting configured

## Emergency Rollback Procedure

If migration fails in production:

1. **Stop Application**
   ```bash
   # Stop all application instances
   ```

2. **Restore Database Backup**
   ```bash
   pg_restore -d production_db backup_latest.dump
   ```

3. **Rollback Application Code**
   ```bash
   # Revert to previous deployment
   ```

4. **Verify Application Health**
   ```bash
   # Run health checks
   # Monitor logs
   ```

5. **Post-Mortem**
   - Document failure cause
   - Update migration procedures
   - Add additional safeguards

## Current Recommendation

**IMMEDIATE ACTION REQUIRED:**

Since the production database is not migration-managed and contains real student data:

1. ✅ **DO NOT** create migrations against production yet
2. ✅ **Document** this migration workflow
3. ✅ **SET UP** staging environment
4. ✅ **TEST** migration workflow on staging
5. ✅ **WAIT** for approved maintenance window
6. ✅ **CREATE** full production backup
7. ✅ **BASELINE** production with migration history
8. ✅ **VERIFY** application functionality post-baseline

**Risk Assessment:**
- Current `db push` method: HIGH RISK (no history, no rollback)
- Migration-managed approach: LOW RISK (versioned, reversible)

**Timeline Estimate:**
- Staging setup: 1-2 days
- Migration testing: 2-3 days
- Production baseline: 1 day (during maintenance window)
- Total: 4-6 days

## Alternative Approach: Shadow Migration

For zero-downtime production baseline:

1. **Create Shadow Database**
   - Copy production to shadow database
   - Apply migrations to shadow
   - Verify all functionality
   - Compare results

2. **Gradual Cutover**
   - Route read traffic to shadow
   - Verify data consistency
   - Route write traffic to shadow
   - Decommission old database

This approach provides maximum safety but requires more infrastructure.

## Conclusion

The current `prisma db push` approach is NOT suitable for production. A proper migration workflow must be established before any further schema changes. The recommended timeline is 4-6 days to safely implement migration management.

**DO NOT** proceed with production migrations until:
- Staging environment is fully operational
- Migration workflow is tested and verified
- Full backup and rollback procedures are in place
- Maintenance window is approved and scheduled

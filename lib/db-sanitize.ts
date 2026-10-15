let hasSanitized = false;

export async function sanitizeDatabaseJsonColumns(client: any, force = false): Promise<void> {
  if (hasSanitized && !force) return;
  try {
    await Promise.allSettled([
      client.$executeRawUnsafe(
        "UPDATE `Teacher` SET `subjects` = '[]' WHERE `subjects` IS NULL OR `subjects` = '' OR `subjects` = 'null' OR `subjects` NOT LIKE '[%'"
      ),
      client.$executeRawUnsafe(
        "UPDATE `Teacher` SET `classes` = '[]' WHERE `classes` IS NULL OR `classes` = '' OR `classes` = 'null' OR `classes` NOT LIKE '[%'"
      ),
      client.$executeRawUnsafe(
        "UPDATE `Teacher` SET `qualifications` = '[]' WHERE `qualifications` IS NULL OR `qualifications` = '' OR `qualifications` = 'null' OR `qualifications` NOT LIKE '[%'"
      ),
      client.$executeRawUnsafe(
        "UPDATE `Subject` SET `classIds` = '[]' WHERE `classIds` IS NULL OR `classIds` = '' OR `classIds` = 'null' OR `classIds` NOT LIKE '[%'"
      ),
      client.$executeRawUnsafe(
        "UPDATE `SaaSPlan` SET `exportFormats` = '[]' WHERE `exportFormats` IS NULL OR `exportFormats` = '' OR `exportFormats` = 'null' OR `exportFormats` NOT LIKE '[%'"
      ),
    ]);
    hasSanitized = true;
    console.log('[db-sanitize] JSON columns sanitized successfully.');
  } catch (err) {
    console.warn('[db-sanitize] Notice while sanitizing JSON columns:', err);
  }
}

import { isMysqlConfigured, getMysqlPool } from './mysqlHelper';
import * as firestore from 'firebase/firestore';

// Types for custom schema mappings
interface MockDocRef {
  type: 'doc';
  path: string;
  id: string;
}

interface MockCollectionRef {
  type: 'collection';
  path: string;
}

interface MockQueryRef {
  type: 'query';
  collection: MockCollectionRef;
  where?: {
    field: string;
    op: string;
    value: any;
  };
}

// -------------------------------------------------------------
// Core Firebase mimicking helpers
// -------------------------------------------------------------

export const collection = (db: any, path: string): any => {
  if (isMysqlConfigured()) {
    return { type: 'collection', path } as MockCollectionRef;
  }
  return firestore.collection(db, path);
};

export const doc = (db: any, path: string, id: string): any => {
  if (isMysqlConfigured()) {
    return { type: 'doc', path, id } as MockDocRef;
  }
  return firestore.doc(db, path, id);
};

export const query = (collectionRef: any, ...clauses: any[]): any => {
  if (isMysqlConfigured()) {
    const q: MockQueryRef = { type: 'query', collection: collectionRef };
    for (const clause of clauses) {
      if (clause && clause.field) {
        q.where = clause;
      }
    }
    return q;
  }
  return firestore.query(collectionRef, ...clauses);
};

export const where = (field: string, op: string, value: any): any => {
  if (isMysqlConfigured()) {
    return { field, op, value };
  }
  return firestore.where(field, op as any, value);
};

export const orderBy = (field: string, direction: string = 'asc'): any => {
  // Ignored in MySQL wrapper because MySQL orders are handled natively in getDocs
  if (isMysqlConfigured()) {
    return null;
  }
  return firestore.orderBy(field, direction as any);
};

export const limit = (num: number): any => {
  // Ignored in MySQL wrapper because limit is natively handled in getDocs queries
  if (isMysqlConfigured()) {
    return null;
  }
  return firestore.limit(num);
};

// -------------------------------------------------------------
// Read/Write operations
// -------------------------------------------------------------

export const getDoc = async (docRef: any): Promise<any> => {
  if (!isMysqlConfigured()) {
    return firestore.getDoc(docRef);
  }

  const { path, id } = docRef as MockDocRef;
  const pool = getMysqlPool();

  try {
    if (path === 'websites') {
      const [rows]: any = await pool.query('SELECT * FROM websites WHERE id = ?', [id]);
      if (rows.length === 0) return { exists: () => false, data: () => null, id };
      const row = rows[0];
      const data = {
        id: row.id,
        name: row.name,
        url: row.url,
        clientName: row.clientName,
        contactEmail: row.contactEmail,
        monitoringInterval: Number(row.monitoringInterval),
        enabled: row.enabled === 1,
        status: row.status,
        responseTime: Number(row.responseTime),
        lastChecked: row.lastChecked,
        sslStatus: row.sslStatus,
        sslExpiry: row.sslExpiry,
        createdAt: row.createdAt
      };
      return { exists: () => true, data: () => data, id };
    }

    if (path === 'sent_reports') {
      const [rows]: any = await pool.query('SELECT * FROM sent_reports WHERE id = ?', [id]);
      if (rows.length === 0) return { exists: () => false, data: () => null, id };
      const row = rows[0];
      const data = {
        id: row.id,
        type: row.type,
        date: row.date,
        week: row.week !== null ? Number(row.week) : null,
        month: row.month !== null ? Number(row.month) : null,
        year: row.year !== null ? Number(row.year) : null,
        sentAt: row.sentAt,
        emailSent: row.emailSent === 1,
        recipient: row.recipient
      };
      return { exists: () => true, data: () => data, id };
    }

    // Default general check for other tables
    const tableName = sanitizeTableName(path);
    const [rows]: any = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
    if (rows.length === 0) return { exists: () => false, data: () => null, id };
    
    // Parse JSON storage or just return fields
    const row = rows[0];
    let parsedData = {};
    if (row.reportData) {
      try {
        parsedData = JSON.parse(row.reportData);
      } catch (e) {
        parsedData = {};
      }
    }
    return {
      exists: () => true,
      data: () => ({ ...row, ...parsedData }),
      id
    };

  } catch (err) {
    console.error(`[SiteGuard] Error in getDoc for ${path}/${id}:`, err);
    throw err;
  }
};

export const getDocs = async (ref: any): Promise<any> => {
  if (!isMysqlConfigured()) {
    return firestore.getDocs(ref);
  }

  const pool = getMysqlPool();
  let path = '';
  let whereClause: any = null;

  if (ref.type === 'collection') {
    path = ref.path;
  } else if (ref.type === 'query') {
    path = ref.collection.path;
    whereClause = ref.where;
  }

  try {
    if (path === 'websites') {
      const [rows]: any = await pool.query('SELECT * FROM websites');
      const docs = rows.map((row: any) => ({
        id: row.id,
        exists: () => true,
        data: () => ({
          id: row.id,
          name: row.name,
          url: row.url,
          clientName: row.clientName,
          contactEmail: row.contactEmail,
          monitoringInterval: Number(row.monitoringInterval),
          enabled: row.enabled === 1,
          status: row.status,
          responseTime: Number(row.responseTime),
          lastChecked: row.lastChecked,
          sslStatus: row.sslStatus,
          sslExpiry: row.sslExpiry,
          createdAt: row.createdAt
        })
      }));
      return { docs, empty: docs.length === 0 };
    }

    if (path === 'monitoring_logs') {
      let queryStr = 'SELECT * FROM monitoring_logs';
      let params: any[] = [];
      
      if (whereClause && whereClause.field === 'checkedAt' && whereClause.op === '<') {
        queryStr += ' WHERE checkedAt < ?';
        params.push(whereClause.value);
      } else {
        // Return latest 100 for telemetry status
        queryStr += ' ORDER BY checkedAt DESC LIMIT 100';
      }

      const [rows]: any = await pool.query(queryStr, params);
      const docs = rows.map((row: any) => ({
        id: row.id,
        exists: () => true,
        data: () => ({
          id: row.id,
          websiteId: row.websiteId,
          websiteName: row.websiteName,
          url: row.url,
          status: row.status,
          responseTime: Number(row.responseTime),
          statusCode: row.statusCode,
          errorMessage: row.errorMessage,
          checkedAt: row.checkedAt
        })
      }));
      return { docs, empty: docs.length === 0 };
    }

    if (path === 'alerts') {
      const [rows]: any = await pool.query('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50');
      const docs = rows.map((row: any) => ({
        id: row.id,
        exists: () => true,
        data: () => ({
          id: row.id,
          websiteId: row.websiteId,
          websiteName: row.websiteName,
          url: row.url,
          type: row.type,
          responseTime: Number(row.responseTime),
          statusCode: row.statusCode,
          errorMessage: row.errorMessage,
          dispatchedTo: row.dispatchedTo,
          dispatchedAt: row.dispatchedAt,
          timestamp: row.timestamp
        })
      }));
      return { docs, empty: docs.length === 0 };
    }

    if (path === 'daily_reports' || path === 'weekly_reports' || path === 'monthly_reports' || path === 'yearly_reports') {
      const tableName = sanitizeTableName(path);
      const [rows]: any = await pool.query(`SELECT * FROM \`${tableName}\` ORDER BY generatedAt DESC`);
      const docs = rows.map((row: any) => {
        let parsedData = {};
        if (row.reportData) {
          try {
            parsedData = JSON.parse(row.reportData);
          } catch (e) {
            parsedData = {};
          }
        }
        return {
          id: row.id,
          exists: () => true,
          data: () => ({
            ...parsedData,
            id: row.id,
            coverage: Number(row.coverage),
            totalChecks: Number(row.totalChecks),
            onlineChecks: Number(row.onlineChecks),
            failedChecks: Number(row.failedChecks),
            avgResponseTime: Number(row.avgResponseTime),
            uptimePercent: Number(row.uptimePercent),
            summary: row.summaryText,
            generatedAt: row.generatedAt
          })
        };
      });
      return { docs, empty: docs.length === 0 };
    }

    // Default empty response
    return { docs: [], empty: true };

  } catch (err) {
    console.error(`[SiteGuard] Error in getDocs for ${path}:`, err);
    throw err;
  }
};

export const setDoc = async (docRef: any, data: any): Promise<void> => {
  if (!isMysqlConfigured()) {
    return firestore.setDoc(docRef, data);
  }

  const { path, id } = docRef as MockDocRef;
  const pool = getMysqlPool();

  try {
    if (path === 'websites') {
      await pool.query(`
        INSERT INTO websites (id, name, url, clientName, contactEmail, monitoringInterval, enabled, status, responseTime, lastChecked, sslStatus, sslExpiry, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          url = VALUES(url),
          clientName = VALUES(clientName),
          contactEmail = VALUES(contactEmail),
          monitoringInterval = VALUES(monitoringInterval),
          enabled = VALUES(enabled),
          status = VALUES(status),
          responseTime = VALUES(responseTime),
          lastChecked = VALUES(lastChecked),
          sslStatus = VALUES(sslStatus),
          sslExpiry = VALUES(sslExpiry)
      `, [
        id,
        data.name || '',
        data.url || '',
        data.clientName || 'Admin',
        data.contactEmail || '',
        data.monitoringInterval !== undefined ? Number(data.monitoringInterval) : 5,
        (data.enabled === true || data.enabled === 1) ? 1 : 0,
        data.status || 'PENDING',
        data.responseTime !== undefined ? Number(data.responseTime) : 0,
        data.lastChecked || null,
        data.sslStatus || null,
        data.sslExpiry || null,
        data.createdAt || new Date().toISOString()
      ]);
      return;
    }

    if (path === 'monitoring_logs') {
      await pool.query(`
        INSERT INTO monitoring_logs (id, websiteId, websiteName, url, status, responseTime, statusCode, errorMessage, checkedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          responseTime = VALUES(responseTime),
          statusCode = VALUES(statusCode),
          errorMessage = VALUES(errorMessage)
      `, [
        id,
        data.websiteId || '',
        data.websiteName || '',
        data.url || '',
        data.status || 'ONLINE',
        data.responseTime !== undefined ? Number(data.responseTime) : 0,
        data.statusCode !== undefined ? Number(data.statusCode) : null,
        data.errorMessage || null,
        data.checkedAt || new Date().toISOString()
      ]);
      return;
    }

    if (path === 'alerts') {
      await pool.query(`
        INSERT INTO alerts (id, websiteId, websiteName, url, type, responseTime, statusCode, errorMessage, dispatchedTo, dispatchedAt, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          dispatchedTo = VALUES(dispatchedTo),
          dispatchedAt = VALUES(dispatchedAt)
      `, [
        id,
        data.websiteId || '',
        data.websiteName || '',
        data.url || '',
        data.type || '',
        data.responseTime !== undefined ? Number(data.responseTime) : 0,
        data.statusCode !== undefined ? Number(data.statusCode) : null,
        data.errorMessage || null,
        data.dispatchedTo || null,
        data.dispatchedAt || null,
        data.timestamp || new Date().toISOString()
      ]);
      return;
    }

    if (path === 'daily_reports' || path === 'weekly_reports' || path === 'monthly_reports' || path === 'yearly_reports') {
      const tableName = sanitizeTableName(path);
      await pool.query(`
        INSERT INTO \`${tableName}\` (id, coverage, totalChecks, onlineChecks, failedChecks, avgResponseTime, uptimePercent, summaryText, generatedAt, reportData)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          coverage = VALUES(coverage),
          totalChecks = VALUES(totalChecks),
          onlineChecks = VALUES(onlineChecks),
          failedChecks = VALUES(failedChecks),
          avgResponseTime = VALUES(avgResponseTime),
          uptimePercent = VALUES(uptimePercent),
          summaryText = VALUES(summaryText),
          reportData = VALUES(reportData)
      `, [
        id,
        data.coverage !== undefined ? Number(data.coverage) : 100,
        data.totalChecks !== undefined ? Number(data.totalChecks) : 0,
        data.onlineChecks !== undefined ? Number(data.onlineChecks) : 0,
        data.failedChecks !== undefined ? Number(data.failedChecks) : 0,
        data.avgResponseTime !== undefined ? Number(data.avgResponseTime) : 0,
        data.uptimePercent !== undefined ? parseFloat(data.uptimePercent) : 100.00,
        data.summary || data.summaryText || '',
        data.generatedAt || new Date().toISOString(),
        JSON.stringify(data)
      ]);
      return;
    }

    if (path === 'sent_reports') {
      await pool.query(`
        INSERT INTO sent_reports (id, type, date, week, month, year, sentAt, emailSent, recipient)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          emailSent = VALUES(emailSent),
          recipient = VALUES(recipient)
      `, [
        id,
        data.type || '',
        data.date || null,
        data.week !== undefined ? Number(data.week) : null,
        data.month !== undefined ? Number(data.month) : null,
        data.year !== undefined ? Number(data.year) : null,
        data.sentAt || new Date().toISOString(),
        (data.emailSent === true || data.emailSent === 1) ? 1 : 0,
        data.recipient || null
      ]);
      return;
    }

  } catch (err) {
    console.error(`[SiteGuard] Error in setDoc for ${path}/${id}:`, err);
    throw err;
  }
};

export const updateDoc = async (docRef: any, data: any): Promise<void> => {
  if (!isMysqlConfigured()) {
    return firestore.updateDoc(docRef, data);
  }

  const { path, id } = docRef as MockDocRef;
  const pool = getMysqlPool();

  try {
    if (path === 'websites') {
      // Dynamically construct update query for only passed fields
      const keys = Object.keys(data);
      if (keys.length === 0) return;

      const setParts: string[] = [];
      const values: any[] = [];

      for (const k of keys) {
        if (k === 'id') continue;
        
        let val = data[k];
        if (k === 'enabled') val = val ? 1 : 0;
        
        setParts.push(`\`${k}\` = ?`);
        values.push(val);
      }

      values.push(id);
      await pool.query(`UPDATE websites SET ${setParts.join(', ')} WHERE id = ?`, values);
      return;
    }

    // Default fallback update
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const merged = { ...docSnap.data(), ...data };
      await setDoc(docRef, merged);
    }
  } catch (err) {
    console.error(`[SiteGuard] Error in updateDoc for ${path}/${id}:`, err);
    throw err;
  }
};

export const addDoc = async (collectionRef: any, data: any): Promise<any> => {
  if (!isMysqlConfigured()) {
    return firestore.addDoc(collectionRef, data);
  }

  const { path } = collectionRef as MockCollectionRef;
  const id = `${path.substring(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const docRef: MockDocRef = { type: 'doc', path, id };

  await setDoc(docRef, { ...data, id });
  return docRef;
};

export const deleteDoc = async (docRef: any): Promise<void> => {
  if (!isMysqlConfigured()) {
    return firestore.deleteDoc(docRef);
  }

  const { path, id } = docRef as MockDocRef;
  const pool = getMysqlPool();

  try {
    const tableName = sanitizeTableName(path);
    await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
  } catch (err) {
    console.error(`[SiteGuard] Error in deleteDoc for ${path}/${id}:`, err);
    throw err;
  }
};

// -------------------------------------------------------------
// Util Helpers
// -------------------------------------------------------------

function sanitizeTableName(path: string): string {
  const allowed = [
    'websites',
    'monitoring_logs',
    'alerts',
    'daily_reports',
    'weekly_reports',
    'monthly_reports',
    'yearly_reports',
    'sent_reports'
  ];
  if (allowed.includes(path)) {
    return path;
  }
  throw new Error(`[SiteGuard] SQL Table Access Denied for path: ${path}`);
}

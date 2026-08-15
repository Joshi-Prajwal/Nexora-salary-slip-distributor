use rusqlite::{params, Connection, Result, Row};
use crate::models::DeliveryRecord;

pub struct DeliveryRepository;

impl DeliveryRepository {
    pub fn new() -> Self {
        Self
    }

    fn map_row(row: &Row) -> Result<DeliveryRecord> {
        Ok(DeliveryRecord {
            id: row.get(0)?,
            salary_slip_id: row.get(1)?,
            employee_id: row.get(2)?,
            channel: row.get(3)?,
            status: row.get(4)?,
            recipient: row.get(5)?,
            provider: row.get(6)?,
            message: row.get(7)?,
            error_code: row.get(8)?,
            error_message: row.get(9)?,
            provider_message_id: row.get(10)?,
            attempt_number: row.get(11)?,
            created_at: row.get(12)?,
            started_at: row.get(13)?,
            completed_at: row.get(14)?,
        })
    }

    pub fn create_record(&self, conn: &Connection, rec: &DeliveryRecord) -> Result<(), String> {
        conn.execute(
            r#"
            INSERT INTO delivery_records (
                id, salary_slip_id, employee_id, channel, status, recipient, provider,
                message, error_code, error_message, provider_message_id, attempt_number,
                created_at, started_at, completed_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            "#,
            params![
                rec.id,
                rec.salary_slip_id,
                rec.employee_id,
                rec.channel,
                rec.status,
                rec.recipient,
                rec.provider,
                rec.message,
                rec.error_code,
                rec.error_message,
                rec.provider_message_id,
                rec.attempt_number,
                rec.created_at,
                rec.started_at,
                rec.completed_at,
            ],
        )
        .map_err(|e| format!("Failed to create delivery record: {}", e))?;

        Ok(())
    }

    pub fn update_status(
        &self,
        conn: &Connection,
        id: &str,
        status: &str,
        provider_message_id: Option<&str>,
        error_code: Option<&str>,
        error_message: Option<&str>,
        completed_at: Option<&str>,
    ) -> Result<(), String> {
        conn.execute(
            r#"
            UPDATE delivery_records
            SET status = ?2,
                provider_message_id = COALESCE(?3, provider_message_id),
                error_code = ?4,
                error_message = ?5,
                completed_at = COALESCE(?6, completed_at)
            WHERE id = ?1
            "#,
            params![id, status, provider_message_id, error_code, error_message, completed_at],
        )
        .map_err(|e| format!("Failed to update delivery record status: {}", e))?;

        Ok(())
    }

    pub fn find_by_slip_and_channel(
        &self,
        conn: &Connection,
        slip_id: &str,
        channel: &str,
    ) -> Result<Option<DeliveryRecord>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, salary_slip_id, employee_id, channel, status, recipient, provider,
                       message, error_code, error_message, provider_message_id, attempt_number,
                       created_at, started_at, completed_at
                FROM delivery_records
                WHERE salary_slip_id = ?1 AND channel = ?2
                ORDER BY attempt_number DESC
                LIMIT 1
                "#,
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![slip_id, channel], Self::map_row)
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next() {
            row.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn find_all(&self, conn: &Connection) -> Result<Vec<DeliveryRecord>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, salary_slip_id, employee_id, channel, status, recipient, provider,
                       message, error_code, error_message, provider_message_id, attempt_number,
                       created_at, started_at, completed_at
                FROM delivery_records
                ORDER BY created_at DESC
                "#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| e.to_string())?);
        }
        Ok(list)
    }

    pub fn find_by_id(&self, conn: &Connection, id: &str) -> Result<Option<DeliveryRecord>, String> {
        let mut stmt = conn
            .prepare(
                r#"
                SELECT id, salary_slip_id, employee_id, channel, status, recipient, provider,
                       message, error_code, error_message, provider_message_id, attempt_number,
                       created_at, started_at, completed_at
                FROM delivery_records
                WHERE id = ?1
                "#,
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![id], Self::map_row)
            .map_err(|e| e.to_string())?;

        if let Some(row) = rows.next() {
            row.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }
}

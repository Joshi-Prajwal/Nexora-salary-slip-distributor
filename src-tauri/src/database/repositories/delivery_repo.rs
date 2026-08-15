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
            employee_name: row.get(15).ok(),
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
                SELECT d.id, d.salary_slip_id, d.employee_id, d.channel, d.status, d.recipient, d.provider,
                       d.message, d.error_code, d.error_message, d.provider_message_id, d.attempt_number,
                       d.created_at, d.started_at, d.completed_at,
                       COALESCE(e.name, s.detected_name) AS employee_name
                FROM delivery_records d
                LEFT JOIN employees e ON d.employee_id = e.employee_id OR d.employee_id = e.id
                LEFT JOIN salary_slips s ON d.salary_slip_id = s.id
                WHERE d.salary_slip_id = ?1 AND d.channel = ?2
                ORDER BY d.attempt_number DESC
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
                SELECT d.id, d.salary_slip_id, d.employee_id, d.channel, d.status, d.recipient, d.provider,
                       d.message, d.error_code, d.error_message, d.provider_message_id, d.attempt_number,
                       d.created_at, d.started_at, d.completed_at,
                       COALESCE(e.name, s.detected_name) AS employee_name
                FROM delivery_records d
                LEFT JOIN employees e ON d.employee_id = e.employee_id OR d.employee_id = e.id
                LEFT JOIN salary_slips s ON d.salary_slip_id = s.id
                ORDER BY d.created_at DESC
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
                SELECT d.id, d.salary_slip_id, d.employee_id, d.channel, d.status, d.recipient, d.provider,
                       d.message, d.error_code, d.error_message, d.provider_message_id, d.attempt_number,
                       d.created_at, d.started_at, d.completed_at,
                       COALESCE(e.name, s.detected_name) AS employee_name
                FROM delivery_records d
                LEFT JOIN employees e ON d.employee_id = e.employee_id OR d.employee_id = e.id
                LEFT JOIN salary_slips s ON d.salary_slip_id = s.id
                WHERE d.id = ?1
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

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::database::connection::DbState;

    #[test]
    fn test_delivery_repository_crud() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = DeliveryRepository::new();
        let record = DeliveryRecord {
            id: "del-1".to_string(),
            salary_slip_id: "slip-1".to_string(),
            employee_id: "EMP001".to_string(),
            channel: "EMAIL".to_string(),
            status: "PENDING".to_string(),
            recipient: "user@test.com".to_string(),
            provider: "SMTP".to_string(),
            message: None,
            error_code: None,
            error_message: None,
            provider_message_id: None,
            attempt_number: 1,
            created_at: "1000".to_string(),
            started_at: None,
            completed_at: None,
            employee_name: None,
        };

        repo.create_record(&conn, &record).unwrap();
        let found = repo.find_by_id(&conn, "del-1").unwrap().unwrap();
        assert_eq!(found.status, "PENDING");

        repo.update_status(&conn, "del-1", "SENT", Some("msg-123"), None, None, Some("1005")).unwrap();
        let updated = repo.find_by_id(&conn, "del-1").unwrap().unwrap();
        assert_eq!(updated.status, "SENT");
        assert_eq!(updated.provider_message_id, Some("msg-123".to_string()));

        let slip_rec = repo.find_by_slip_and_channel(&conn, "slip-1", "EMAIL").unwrap().unwrap();
        assert_eq!(slip_rec.id, "del-1");
    }
}

use rusqlite::Connection;
use crate::models::{DeliveryBatchSummary, DeliveryChannel, DeliveryPreview, DeliveryRecord, SalarySlip};
use crate::database::repositories::{DeliveryRepository, EmployeeRepository, SalarySlipRepository};
use crate::messaging::email::{replace_placeholders, EmailProvider, SmtpEmailProvider};
use crate::messaging::whatsapp::{OfficialCloudApiWhatsAppProvider, WhatsAppProvider};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn current_timestamp() -> String {
    let start = SystemTime::now();
    let since = start.duration_since(UNIX_EPOCH).unwrap_or_default();
    format!("{}", since.as_secs())
}

fn simple_id(prefix: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{}_{:x}", prefix, nanos)
}

pub struct DeliveryService {
    delivery_repo: DeliveryRepository,
    slip_repo: SalarySlipRepository,
    emp_repo: EmployeeRepository,
    email_provider: SmtpEmailProvider,
    whatsapp_provider: OfficialCloudApiWhatsAppProvider,
}

impl DeliveryService {
    pub fn new() -> Self {
        Self {
            delivery_repo: DeliveryRepository::new(),
            slip_repo: SalarySlipRepository::new(),
            emp_repo: EmployeeRepository::new(),
            email_provider: SmtpEmailProvider::new(),
            whatsapp_provider: OfficialCloudApiWhatsAppProvider::new(),
        }
    }

    fn is_approved(slip: &SalarySlip) -> bool {
        (slip.approval_status == "APPROVED" || slip.match_status == "MANUALLY_CONFIRMED")
            && slip.match_status != "CONFLICT"
            && slip.match_status != "UNMATCHED"
            && slip.match_status != "NO_MATCH"
    }

    pub fn preview_batch(
        &self,
        conn: &Connection,
        slip_ids: &[String],
        channel_str: &str,
    ) -> Result<DeliveryPreview, String> {
        let channel = DeliveryChannel::from_str(channel_str);
        let total_requested = slip_ids.len();

        let mut eligible_count = 0;
        let mut missing_email_count = 0;
        let mut missing_whatsapp_count = 0;
        let not_configured_count = 0;
        let mut already_sent_count = 0;
        let mut ineligible_count = 0;
        let mut estimated_deliveries = 0;

        let check_email = channel == DeliveryChannel::Email || channel == DeliveryChannel::Both;
        let check_wa = channel == DeliveryChannel::WhatsApp || channel == DeliveryChannel::Both;

        for slip_id in slip_ids {
            let slip = match self.slip_repo.find_by_id(conn, slip_id)? {
                Some(s) => s,
                None => {
                    ineligible_count += 1;
                    continue;
                }
            };

            if !Self::is_approved(&slip) {
                ineligible_count += 1;
                continue;
            }

            let emp_id = match &slip.matched_employee_id {
                Some(id) if !id.is_empty() => id,
                _ => {
                    ineligible_count += 1;
                    continue;
                }
            };

            let emp = match self.emp_repo.find_by_id(conn, emp_id)? {
                Some(e) => e,
                None => {
                    ineligible_count += 1;
                    continue;
                }
            };

            if !Path::new(&slip.file_path).exists() {
                ineligible_count += 1;
                continue;
            }

            let mut slip_eligible = false;

            if check_email {
                let existing = self
                    .delivery_repo
                    .find_by_slip_and_channel(conn, &slip.id, "EMAIL")?;
                if let Some(ref rec) = existing {
                    if rec.status == "SENT" {
                        already_sent_count += 1;
                    } else if emp.email.as_deref().unwrap_or("").trim().is_empty() {
                        missing_email_count += 1;
                    } else {
                        slip_eligible = true;
                        estimated_deliveries += 1;
                    }
                } else if emp.email.as_deref().unwrap_or("").trim().is_empty() {
                    missing_email_count += 1;
                } else {
                    slip_eligible = true;
                    estimated_deliveries += 1;
                }
            }

            if check_wa {
                let existing = self
                    .delivery_repo
                    .find_by_slip_and_channel(conn, &slip.id, "WHATSAPP")?;
                if let Some(ref rec) = existing {
                    if rec.status == "SENT" {
                        already_sent_count += 1;
                    } else if emp.phone.as_deref().unwrap_or("").trim().is_empty() {
                        missing_whatsapp_count += 1;
                    } else {
                        slip_eligible = true;
                        estimated_deliveries += 1;
                    }
                } else if emp.phone.as_deref().unwrap_or("").trim().is_empty() {
                    missing_whatsapp_count += 1;
                } else {
                    slip_eligible = true;
                    estimated_deliveries += 1;
                }
            }

            if slip_eligible {
                eligible_count += 1;
            }
        }

        Ok(DeliveryPreview {
            total_requested,
            eligible_count,
            missing_email_count,
            missing_whatsapp_count,
            not_configured_count,
            already_sent_count,
            ineligible_count,
            estimated_deliveries,
        })
    }

    pub fn send_batch(
        &self,
        conn: &Connection,
        slip_ids: &[String],
        channel_str: &str,
    ) -> Result<DeliveryBatchSummary, String> {
        let channel = DeliveryChannel::from_str(channel_str);
        let total = slip_ids.len();

        let mut sent = 0;
        let mut failed = 0;
        let mut skipped = 0;
        let mut already_sent = 0;
        let mut email_sent = 0;
        let mut whatsapp_sent = 0;
        let mut email_failed = 0;
        let mut whatsapp_failed = 0;
        let mut records = Vec::new();

        let process_email = channel == DeliveryChannel::Email || channel == DeliveryChannel::Both;
        let process_wa = channel == DeliveryChannel::WhatsApp || channel == DeliveryChannel::Both;

        let settings_repo = crate::database::repositories::SettingsRepository::new();
        let email_cfg = settings_repo.get_email_config(conn).unwrap_or_default();
        let wa_cfg = settings_repo.get_whatsapp_config(conn).unwrap_or_default();
        let template_cfg = settings_repo.get_template_config(conn).unwrap_or_default();
        let company_name = settings_repo.get_company_name(conn).unwrap_or_else(|_| "Company".to_string());

        let smtp_host = if !email_cfg.host.is_empty() { &email_cfg.host } else { "smtp.gmail.com" };
        let smtp_port = if email_cfg.port > 0 { email_cfg.port } else { 587 };
        let smtp_user = if !email_cfg.username.is_empty() { &email_cfg.username } else { "" };
        let smtp_pass = email_cfg.password.as_deref().unwrap_or("");
        let smtp_from = if !email_cfg.from_address.is_empty() { &email_cfg.from_address } else { smtp_user };
        let smtp_name = if !email_cfg.from_name.is_empty() { &email_cfg.from_name } else { &company_name };

        let wa_url = if !wa_cfg.api_url.is_empty() { &wa_cfg.api_url } else { "https://graph.facebook.com/v18.0" };
        let wa_token = wa_cfg.api_token.as_deref().unwrap_or("");
        let wa_phone_id = if !wa_cfg.phone_number_id.is_empty() { &wa_cfg.phone_number_id } else { "" };

        for slip_id in slip_ids {
            let slip = match self.slip_repo.find_by_id(conn, slip_id)? {
                Some(s) => s,
                None => {
                    skipped += 1;
                    continue;
                }
            };

            if !Self::is_approved(&slip) {
                skipped += 1;
                continue;
            }

            let emp_id = match &slip.matched_employee_id {
                Some(id) if !id.is_empty() => id,
                _ => {
                    skipped += 1;
                    continue;
                }
            };

            let emp = match self.emp_repo.find_by_id(conn, emp_id)? {
                Some(e) => e,
                None => {
                    skipped += 1;
                    continue;
                }
            };

            // EMAIL CHANNEL DELIVERY
            if process_email {
                let existing = self
                    .delivery_repo
                    .find_by_slip_and_channel(conn, &slip.id, "EMAIL")?;

                if let Some(ref rec) = existing {
                    let slip_month = slip.month.as_deref().unwrap_or("Current Month");
                    let slip_year = slip.year.as_deref().unwrap_or("Current Year");
                    let business_emp_id = if !emp.employee_id.is_empty() { emp.employee_id.clone() } else { emp.id.clone() };

                    if rec.status == "SENT" {
                        already_sent += 1;
                        skipped += 1;
                        records.push(rec.clone());
                    } else {
                        let recipient_email = emp.email.clone().unwrap_or_default().trim().to_string();
                        let rec_id = simple_id("del");
                        let created = current_timestamp();

                        let subject_rendered = replace_placeholders(
                            if template_cfg.email_subject.is_empty() { "Salary Slip - {{month}} {{year}}" } else { &template_cfg.email_subject },
                            &emp.name,
                            &emp.employee_id,
                            &company_name,
                            slip_month,
                            slip_year,
                        );

                        let body_rendered = replace_placeholders(
                            if template_cfg.email_body_html.is_empty() { "Dear {{employee_name}},\n\nPlease find attached your salary slip.\n\nRegards,\n{{company_name}}" } else { &template_cfg.email_body_html },
                            &emp.name,
                            &emp.employee_id,
                            &company_name,
                            slip_month,
                            slip_year,
                        );

                        let mut new_rec = DeliveryRecord {
                            id: rec_id.clone(),
                            salary_slip_id: slip.id.clone(),
                            employee_id: business_emp_id.clone(),
                            channel: "EMAIL".to_string(),
                            status: "PROCESSING".to_string(),
                            recipient: recipient_email.clone(),
                            provider: "SMTP".to_string(),
                            message: Some(body_rendered.clone()),
                            error_code: None,
                            error_message: None,
                            provider_message_id: None,
                            attempt_number: rec.attempt_number + 1,
                            created_at: created.clone(),
                            started_at: Some(created.clone()),
                            completed_at: None,
                            employee_name: Some(emp.name.clone()),
                            month: slip.month.clone(),
                            year: slip.year.clone(),
                        };

                        self.delivery_repo.create_record(conn, &new_rec)?;

                        match self.email_provider.send_salary_slip(
                            smtp_host,
                            smtp_port,
                            smtp_user,
                            smtp_pass,
                            smtp_from,
                            smtp_name,
                            &recipient_email,
                            &subject_rendered,
                            &body_rendered,
                            &slip.file_path,
                        ) {
                            Ok(msg_id) => {
                                let comp = current_timestamp();
                                self.delivery_repo.update_status(
                                    conn,
                                    &rec_id,
                                    "SENT",
                                    Some(&msg_id),
                                    None,
                                    None,
                                    Some(&comp),
                                )?;
                                new_rec.status = "SENT".to_string();
                                new_rec.provider_message_id = Some(msg_id);
                                new_rec.completed_at = Some(comp);
                                sent += 1;
                                email_sent += 1;
                            }
                            Err(err) => {
                                let comp = current_timestamp();
                                let err_msg = err.to_string();
                                self.delivery_repo.update_status(
                                    conn,
                                    &rec_id,
                                    "FAILED",
                                    None,
                                    Some("EMAIL_FAILED"),
                                    Some(&err_msg),
                                    Some(&comp),
                                )?;
                                new_rec.status = "FAILED".to_string();
                                new_rec.error_code = Some("EMAIL_FAILED".to_string());
                                new_rec.error_message = Some(err_msg);
                                new_rec.completed_at = Some(comp);
                                failed += 1;
                                email_failed += 1;
                            }
                        }
                        records.push(new_rec);
                    }
                } else {
                    let slip_month = slip.month.as_deref().unwrap_or("Current Month");
                    let slip_year = slip.year.as_deref().unwrap_or("Current Year");
                    let business_emp_id = if !emp.employee_id.is_empty() { emp.employee_id.clone() } else { emp.id.clone() };
                    let recipient_email = emp.email.clone().unwrap_or_default().trim().to_string();
                    let rec_id = simple_id("del");
                    let created = current_timestamp();

                    let subject_rendered = replace_placeholders(
                        if template_cfg.email_subject.is_empty() { "Salary Slip - {{month}} {{year}}" } else { &template_cfg.email_subject },
                        &emp.name,
                        &emp.employee_id,
                        &company_name,
                        slip_month,
                        slip_year,
                    );

                    let body_rendered = replace_placeholders(
                        if template_cfg.email_body_html.is_empty() { "Dear {{employee_name}},\n\nPlease find attached your salary slip.\n\nRegards,\n{{company_name}}" } else { &template_cfg.email_body_html },
                        &emp.name,
                        &emp.employee_id,
                        &company_name,
                        slip_month,
                        slip_year,
                    );

                    let mut new_rec = DeliveryRecord {
                        id: rec_id.clone(),
                        salary_slip_id: slip.id.clone(),
                        employee_id: business_emp_id.clone(),
                        channel: "EMAIL".to_string(),
                        status: "PROCESSING".to_string(),
                        recipient: recipient_email.clone(),
                        provider: "SMTP".to_string(),
                        message: Some(body_rendered.clone()),
                        error_code: None,
                        error_message: None,
                        provider_message_id: None,
                        attempt_number: 1,
                        created_at: created.clone(),
                        started_at: Some(created.clone()),
                        completed_at: None,
                        employee_name: Some(emp.name.clone()),
                        month: slip.month.clone(),
                        year: slip.year.clone(),
                    };

                    self.delivery_repo.create_record(conn, &new_rec)?;

                    match self.email_provider.send_salary_slip(
                        smtp_host,
                        smtp_port,
                        smtp_user,
                        smtp_pass,
                        smtp_from,
                        smtp_name,
                        &recipient_email,
                        &subject_rendered,
                        &body_rendered,
                        &slip.file_path,
                    ) {
                        Ok(msg_id) => {
                            let comp = current_timestamp();
                            self.delivery_repo.update_status(
                                conn,
                                &rec_id,
                                "SENT",
                                Some(&msg_id),
                                None,
                                None,
                                Some(&comp),
                            )?;
                            new_rec.status = "SENT".to_string();
                            new_rec.provider_message_id = Some(msg_id);
                            new_rec.completed_at = Some(comp);
                            sent += 1;
                            email_sent += 1;
                        }
                        Err(err) => {
                            let comp = current_timestamp();
                            let err_msg = err.to_string();
                            self.delivery_repo.update_status(
                                conn,
                                &rec_id,
                                "FAILED",
                                None,
                                Some("EMAIL_FAILED"),
                                Some(&err_msg),
                                Some(&comp),
                            )?;
                            new_rec.status = "FAILED".to_string();
                            new_rec.error_code = Some("EMAIL_FAILED".to_string());
                            new_rec.error_message = Some(err_msg);
                            new_rec.completed_at = Some(comp);
                            failed += 1;
                            email_failed += 1;
                        }
                    }
                    records.push(new_rec);
                }
            }

            // WHATSAPP CHANNEL DELIVERY
            if process_wa {
                let existing = self
                    .delivery_repo
                    .find_by_slip_and_channel(conn, &slip.id, "WHATSAPP")?;

                if let Some(ref rec) = existing {
                    let slip_month = slip.month.as_deref().unwrap_or("Current Month");
                    let slip_year = slip.year.as_deref().unwrap_or("Current Year");
                    let business_emp_id = if !emp.employee_id.is_empty() { emp.employee_id.clone() } else { emp.id.clone() };

                    if rec.status == "SENT" {
                        already_sent += 1;
                        skipped += 1;
                        records.push(rec.clone());
                    } else {
                        let recipient_phone = emp.phone.clone().unwrap_or_default();
                        let rec_id = simple_id("del");
                        let created = current_timestamp();

                        let mut new_rec = DeliveryRecord {
                            id: rec_id.clone(),
                            salary_slip_id: slip.id.clone(),
                            employee_id: business_emp_id.clone(),
                            channel: "WHATSAPP".to_string(),
                            status: "PROCESSING".to_string(),
                            recipient: recipient_phone.clone(),
                            provider: "WHATSAPP_CLOUD_API".to_string(),
                            message: Some(replace_placeholders(
                                "Hello {{employee_name}}, your salary slip is attached.",
                                &emp.name,
                                &emp.employee_id,
                                &company_name,
                                slip_month,
                                slip_year,
                            )),
                            error_code: None,
                            error_message: None,
                            provider_message_id: None,
                            attempt_number: rec.attempt_number + 1,
                            created_at: created.clone(),
                            started_at: Some(created.clone()),
                            completed_at: None,
                            employee_name: Some(emp.name.clone()),
                            month: slip.month.clone(),
                            year: slip.year.clone(),
                        };

                        self.delivery_repo.create_record(conn, &new_rec)?;

                        match self.whatsapp_provider.send_document(
                            wa_url,
                            wa_token,
                            wa_phone_id,
                            &recipient_phone,
                            &slip.file_path,
                            new_rec.message.as_deref().unwrap_or(""),
                        ) {
                            Ok(msg_id) => {
                                let comp = current_timestamp();
                                self.delivery_repo.update_status(
                                    conn,
                                    &rec_id,
                                    "SENT",
                                    Some(&msg_id),
                                    None,
                                    None,
                                    Some(&comp),
                                )?;
                                new_rec.status = "SENT".to_string();
                                new_rec.provider_message_id = Some(msg_id);
                                new_rec.completed_at = Some(comp);
                                sent += 1;
                                whatsapp_sent += 1;
                            }
                            Err(err) => {
                                let comp = current_timestamp();
                                let err_msg = err.to_string();
                                self.delivery_repo.update_status(
                                    conn,
                                    &rec_id,
                                    "FAILED",
                                    None,
                                    Some("WHATSAPP_FAILED"),
                                    Some(&err_msg),
                                    Some(&comp),
                                )?;
                                new_rec.status = "FAILED".to_string();
                                new_rec.error_code = Some("WHATSAPP_FAILED".to_string());
                                new_rec.error_message = Some(err_msg);
                                new_rec.completed_at = Some(comp);
                                failed += 1;
                                whatsapp_failed += 1;
                            }
                        }
                        records.push(new_rec);
                    }
                } else {
                    let slip_month = slip.month.as_deref().unwrap_or("Current Month");
                    let slip_year = slip.year.as_deref().unwrap_or("Current Year");
                    let business_emp_id = if !emp.employee_id.is_empty() { emp.employee_id.clone() } else { emp.id.clone() };
                    let recipient_phone = emp.phone.clone().unwrap_or_default();
                    let rec_id = simple_id("del");
                    let created = current_timestamp();

                    let mut new_rec = DeliveryRecord {
                        id: rec_id.clone(),
                        salary_slip_id: slip.id.clone(),
                        employee_id: business_emp_id.clone(),
                        channel: "WHATSAPP".to_string(),
                        status: "PROCESSING".to_string(),
                        recipient: recipient_phone.clone(),
                        provider: "WHATSAPP_CLOUD_API".to_string(),
                        message: Some(replace_placeholders(
                            "Hello {{employee_name}}, your salary slip is attached.",
                            &emp.name,
                            &emp.employee_id,
                            &company_name,
                            slip_month,
                            slip_year,
                        )),
                        error_code: None,
                        error_message: None,
                        provider_message_id: None,
                        attempt_number: 1,
                        created_at: created.clone(),
                        started_at: Some(created.clone()),
                        completed_at: None,
                        employee_name: Some(emp.name.clone()),
                        month: slip.month.clone(),
                        year: slip.year.clone(),
                    };

                    self.delivery_repo.create_record(conn, &new_rec)?;

                    match self.whatsapp_provider.send_document(
                        wa_url,
                        wa_token,
                        wa_phone_id,
                        &recipient_phone,
                        &slip.file_path,
                        new_rec.message.as_deref().unwrap_or(""),
                    ) {
                        Ok(msg_id) => {
                            let comp = current_timestamp();
                            self.delivery_repo.update_status(
                                conn,
                                &rec_id,
                                "SENT",
                                Some(&msg_id),
                                None,
                                None,
                                Some(&comp),
                            )?;
                            new_rec.status = "SENT".to_string();
                            new_rec.provider_message_id = Some(msg_id);
                            new_rec.completed_at = Some(comp);
                            sent += 1;
                            whatsapp_sent += 1;
                        }
                        Err(err) => {
                            let comp = current_timestamp();
                            let err_msg = err.to_string();
                            self.delivery_repo.update_status(
                                conn,
                                &rec_id,
                                "FAILED",
                                None,
                                Some("WHATSAPP_FAILED"),
                                Some(&err_msg),
                                Some(&comp),
                            )?;
                            new_rec.status = "FAILED".to_string();
                            new_rec.error_code = Some("WHATSAPP_FAILED".to_string());
                            new_rec.error_message = Some(err_msg);
                            new_rec.completed_at = Some(comp);
                            failed += 1;
                            whatsapp_failed += 1;
                        }
                    }
                    records.push(new_rec);
                }
            }
        }

        Ok(DeliveryBatchSummary {
            total,
            sent,
            failed,
            skipped,
            already_sent,
            email_sent,
            whatsapp_sent,
            email_failed,
            whatsapp_failed,
            records,
        })
    }

    pub fn retry_delivery_record(&self, conn: &Connection, record_id: &str) -> Result<DeliveryRecord, String> {
        let rec = match self.delivery_repo.find_by_id(conn, record_id)? {
            Some(r) => r,
            None => return Err(format!("Delivery record not found with ID: {}", record_id)),
        };

        if rec.status != "FAILED" {
            return Err("Only FAILED delivery records can be retried".to_string());
        }

        let slip = match self.slip_repo.find_by_id(conn, &rec.salary_slip_id)? {
            Some(s) => s,
            None => return Err("Associated salary slip not found".to_string()),
        };

        if !Self::is_approved(&slip) {
            return Err("Salary slip is not approved or is in an ineligible matching state (CONFLICT, UNMATCHED, or NO_MATCH). Delivery retry blocked.".to_string());
        }

        if !Path::new(&slip.file_path).exists() {
            return Err(format!("Salary slip PDF file not found on disk: {}", slip.file_path));
        }

        let now_str = current_timestamp();

        let settings_repo = crate::database::repositories::SettingsRepository::new();
        let email_cfg = settings_repo.get_email_config(conn).unwrap_or_default();
        let wa_cfg = settings_repo.get_whatsapp_config(conn).unwrap_or_default();
        let next_attempt = rec.attempt_number + 1;
        let new_rec_id = simple_id("del");

        let new_rec = DeliveryRecord {
            id: new_rec_id.clone(),
            salary_slip_id: rec.salary_slip_id.clone(),
            employee_id: rec.employee_id.clone(),
            channel: rec.channel.clone(),
            status: "PROCESSING".to_string(),
            recipient: rec.recipient.clone(),
            provider: rec.provider.clone(),
            message: rec.message.clone(),
            error_code: None,
            error_message: None,
            provider_message_id: None,
            attempt_number: next_attempt,
            created_at: now_str.clone(),
            started_at: Some(now_str.clone()),
            completed_at: None,
            employee_name: rec.employee_name.clone(),
            month: rec.month.clone(),
            year: rec.year.clone(),
        };

        self.delivery_repo.create_record(conn, &new_rec)?;

        if rec.channel == "EMAIL" {
            let host = if !email_cfg.host.is_empty() { &email_cfg.host } else { "mail.company.com" };
            let port = if email_cfg.port > 0 { email_cfg.port } else { 587 };
            let user = if !email_cfg.username.is_empty() { &email_cfg.username } else { "user@company.com" };
            let pass = email_cfg.password.as_deref().unwrap_or("secret");
            let from = if !email_cfg.from_address.is_empty() { &email_cfg.from_address } else { user };
            let name = if !email_cfg.from_name.is_empty() { &email_cfg.from_name } else { "HR Department" };

            let res = self.email_provider.send_salary_slip(
                host,
                port,
                user,
                pass,
                from,
                name,
                &rec.recipient,
                "Salary Slip",
                rec.message.as_deref().unwrap_or(""),
                &slip.file_path,
            );

            let comp = current_timestamp();
            match res {
                Ok(msg_id) => {
                    self.delivery_repo.update_status(
                        conn,
                        &new_rec_id,
                        "SENT",
                        Some(&msg_id),
                        None,
                        None,
                        Some(&comp),
                    )?;
                }
                Err(err) => {
                    let err_msg = err.to_string();
                    self.delivery_repo.update_status(
                        conn,
                        &new_rec_id,
                        "FAILED",
                        None,
                        Some("RETRY_FAILED"),
                        Some(&err_msg),
                        Some(&comp),
                    )?;
                }
            }
        } else {
            let url = if !wa_cfg.api_url.is_empty() { &wa_cfg.api_url } else { "https://graph.facebook.com/v18.0" };
            let token = wa_cfg.api_token.as_deref().unwrap_or("access_token_placeholder");
            let phone_id = if !wa_cfg.phone_number_id.is_empty() { &wa_cfg.phone_number_id } else { "100020003000" };

            let res = self.whatsapp_provider.send_document(
                url,
                token,
                phone_id,
                &rec.recipient,
                &slip.file_path,
                rec.message.as_deref().unwrap_or(""),
            );

            let comp = current_timestamp();
            match res {
                Ok(msg_id) => {
                    self.delivery_repo.update_status(
                        conn,
                        &new_rec_id,
                        "SENT",
                        Some(&msg_id),
                        None,
                        None,
                        Some(&comp),
                    )?;
                }
                Err(err) => {
                    let err_msg = err.to_string();
                    self.delivery_repo.update_status(
                        conn,
                        &new_rec_id,
                        "FAILED",
                        None,
                        Some("RETRY_FAILED"),
                        Some(&err_msg),
                        Some(&comp),
                    )?;
                }
            }
        }

        match self.delivery_repo.find_by_id(conn, &new_rec_id)? {
            Some(updated) => Ok(updated),
            None => Err("Failed to retrieve updated delivery record".to_string()),
        }
    }

    pub fn get_delivery_records(&self, conn: &Connection) -> Result<Vec<DeliveryRecord>, String> {
        self.delivery_repo.find_all(conn)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::connection::DbState;
    use crate::models::SalarySlip;
    use rusqlite::Connection;

    #[test]
    fn test_delivery_approval_gate_enforcement() {
        let mut unapproved_slip = SalarySlip {
            id: "slip-test-1".to_string(),
            file_path: "C:\\dummy\\slip.pdf".to_string(),
            file_name: "slip.pdf".to_string(),
            file_hash: "hash123".to_string(),
            detected_employee_id: Some("EMP001".to_string()),
            detected_name: Some("Alice".to_string()),
            detected_phone: None,
            detected_email: Some("alice@company.com".to_string()),
            extraction_method: "TEXT_EMBEDDED".to_string(),
            extracted_text: Some("Salary Slip".to_string()),
            match_confidence: 1.0,
            match_status: "EXACT_MATCH".to_string(),
            duplicate_of_id: None,
            ocr_confidence: None,
            ocr_processed_at: None,
            ocr_error: None,
            matched_employee_id: Some("EMP001".to_string()),
            match_reason: None,
            matched_at: None,
            reviewed_at: None,
            reviewed_by: None,
            review_note: None,
            month: Some("August".to_string()),
            year: Some("2026".to_string()),
            approval_status: "PENDING".to_string(),
            ocr_status: "NOT_REQUIRED".to_string(),
            document_type: Some("SALARY_SLIP".to_string()),
            document_confidence: Some(100.0),
            ocr_attempt_count: None,
            ocr_page_count: None,
            ocr_processing_time_ms: None,
            created_at: "1000".to_string(),
            updated_at: "1000".to_string(),
        };

        // Invariant: EXACT_MATCH with PENDING approval MUST NOT be eligible to send
        assert!(!DeliveryService::is_approved(&unapproved_slip), "Unapproved slip should NOT pass approval gate");

        // Approved slip MUST pass approval gate
        unapproved_slip.approval_status = "APPROVED".to_string();
        assert!(DeliveryService::is_approved(&unapproved_slip), "Approved slip MUST pass approval gate");

        // Manually confirmed slip MUST pass approval gate
        unapproved_slip.approval_status = "PENDING".to_string();
        unapproved_slip.match_status = "MANUALLY_CONFIRMED".to_string();
        assert!(DeliveryService::is_approved(&unapproved_slip), "Manually confirmed slip MUST pass approval gate");
    }

    #[test]
    fn test_retry_creates_new_attempt_and_preserves_history() {
        let conn = Connection::open_in_memory().unwrap();
        DbState::migrate(&conn).unwrap();

        let repo = DeliveryRepository::new();

        let initial_record = DeliveryRecord {
            id: "del_attempt_1".to_string(),
            salary_slip_id: "slip-test".to_string(),
            employee_id: "emp-test".to_string(),
            channel: "EMAIL".to_string(),
            status: "FAILED".to_string(),
            recipient: "test@example.com".to_string(),
            provider: "SMTP".to_string(),
            message: Some("Body".to_string()),
            error_code: Some("EMAIL_FAILED".to_string()),
            error_message: Some("Connection refused".to_string()),
            provider_message_id: None,
            attempt_number: 1,
            created_at: "1000".to_string(),
            started_at: Some("1000".to_string()),
            completed_at: Some("1001".to_string()),
            employee_name: Some("Test Employee".to_string()),
            month: None,
            year: None,
        };

        repo.create_record(&conn, &initial_record).unwrap();

        // Check that attempt 1 exists
        let records_before = repo.find_all(&conn).unwrap();
        assert_eq!(records_before.len(), 1);
        assert_eq!(records_before[0].attempt_number, 1);
        assert_eq!(records_before[0].status, "FAILED");
    }
}

/**
 * 成员管理命令
 *
 * 对应 Electron 版本的 members.ts
 * 包含成员 CRUD、班组管理、项目成员关联
 */

use crate::db::AppState;
use crate::error::{AppError, AppResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============ 成员类型 ============

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub member_type: Option<String>, // 'staff' | 'worker'
    pub role: Option<String>,
    pub worker_type: Option<String>,
    pub id_card: Option<String>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub birth_date: Option<String>,
    pub id_card_address: Option<String>,
    pub base_salary: Option<f64>,
    pub daily_wage: Option<f64>,
    pub entry_date: Option<String>,
    pub status: Option<String>,
    pub department_id: Option<i64>,
    pub position: Option<String>,
    pub created_at: Option<String>,
    // 关联查询时附带
    pub team_name: Option<String>,
    pub project_name: Option<String>,
    pub department_name: Option<String>,
}

/// 获取所有成员
#[command]
pub fn get_members(state: State<'_, AppState>) -> AppResult<Vec<Member>> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT m.id, m.name, m.phone, m.email, m.member_type, m.role,
                    m.worker_type, m.id_card, m.gender, m.ethnicity, m.birth_date,
                    m.id_card_address, m.base_salary, m.daily_wage, m.entry_date,
                    m.status, m.department_id, m.position, m.created_at,
                    wt.name as team_name,
                    p.name as project_name,
                    d.name as department_name
             FROM members m
             LEFT JOIN worker_teams wt ON m.team_id = wt.id
             LEFT JOIN projects p ON wt.project_id = p.id
             LEFT JOIN departments d ON m.department_id = d.id
             ORDER BY m.created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let members = stmt
        .query_map([], |row| {
            Ok(Member {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                member_type: row.get(4)?,
                role: row.get(5)?,
                worker_type: row.get(6)?,
                id_card: row.get(7)?,
                gender: row.get(8)?,
                ethnicity: row.get(9)?,
                birth_date: row.get(10)?,
                id_card_address: row.get(11)?,
                base_salary: row.get(12)?,
                daily_wage: row.get(13)?,
                entry_date: row.get(14)?,
                status: row.get(15)?,
                department_id: row.get(16)?,
                position: row.get(17)?,
                created_at: row.get(18)?,
                team_name: row.get(19)?,
                project_name: row.get(20)?,
                department_name: row.get(21)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(members)
}

/// 创建成员
#[command]
pub fn create_member(state: State<'_, AppState>, member: Member) -> AppResult<i64> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    db.execute(
        "INSERT INTO members (name, phone, email, member_type, role, worker_type,
         id_card, gender, ethnicity, birth_date, id_card_address, base_salary,
         daily_wage, entry_date, status, department_id, position)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            member.name,
            member.phone,
            member.email,
            member.member_type,
            member.role,
            member.worker_type,
            member.id_card,
            member.gender,
            member.ethnicity,
            member.birth_date,
            member.id_card_address,
            member.base_salary,
            member.daily_wage,
            member.entry_date,
            member.status,
            member.department_id,
            member.position,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    let id = db.last_insert_rowid();

    // 如果有基本工资，自动创建薪资历史记录
    if let Some(base_salary) = member.base_salary {
        if base_salary > 0.0 {
            let effective_date = member
                .entry_date
                .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

            db.execute(
                "INSERT INTO salary_history (member_id, effective_date, base_salary, note)
                 VALUES (?1, ?2, ?3, '入职初始薪资')",
                params![id, effective_date, base_salary],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        }
    }

    Ok(id)
}

/// 更新成员
#[command]
pub fn update_member(state: State<'_, AppState>, member: Member) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute(
            "UPDATE members SET name = ?1, phone = ?2, email = ?3, member_type = ?4,
             role = ?5, worker_type = ?6, id_card = ?7, gender = ?8, ethnicity = ?9,
             birth_date = ?10, id_card_address = ?11, base_salary = ?12, daily_wage = ?13,
             entry_date = ?14, status = ?15, department_id = ?16, position = ?17
             WHERE id = ?18",
            params![
                member.name,
                member.phone,
                member.email,
                member.member_type,
                member.role,
                member.worker_type,
                member.id_card,
                member.gender,
                member.ethnicity,
                member.birth_date,
                member.id_card_address,
                member.base_salary,
                member.daily_wage,
                member.entry_date,
                member.status,
                member.department_id,
                member.position,
                member.id,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("成员 {} 不存在", member.id)));
    }

    Ok(())
}

/// 删除成员
#[command]
pub fn delete_member(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let db = state.db.lock().map_err(|e| AppError::Database(e.to_string()))?;

    let affected = db
        .execute("DELETE FROM members WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("成员 {} 不存在", id)));
    }

    // 删除相关的薪资历史
    db.execute(
        "DELETE FROM salary_history WHERE member_id = ?1",
        params![id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

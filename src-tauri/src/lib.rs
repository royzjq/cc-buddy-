use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex;

type HotRegions = Arc<Mutex<Vec<[f64; 4]>>>;

#[derive(Debug, Serialize, Default)]
struct UsageWindow {
    cost_usd: f64,
    total_tokens: u64,
    percent: f64,
    reset_in_minutes: Option<i64>,
}

#[derive(Debug, Serialize, Default)]
struct UsageSnapshot {
    five_hour: UsageWindow,
    weekly: UsageWindow,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HookEvent {
    SessionStart {
        session_id: String,
        #[serde(default)]
        cwd: String,
        #[serde(default)]
        ppid: Option<u32>,
    },
    Notification { session_id: String, #[serde(default)] cwd: String },
    Thinking { session_id: String },
    Stop { session_id: String },
    Done { session_id: String },
    SessionEnd { session_id: String },
}

impl HookEvent {
    fn session_id(&self) -> &str {
        match self {
            HookEvent::SessionStart { session_id, .. }
            | HookEvent::Notification { session_id, .. }
            | HookEvent::Thinking { session_id }
            | HookEvent::Stop { session_id }
            | HookEvent::Done { session_id }
            | HookEvent::SessionEnd { session_id } => session_id,
        }
    }
}

type SessionMap = Arc<Mutex<HashMap<String, HookEvent>>>;

const WS_ADDR: &str = "127.0.0.1:19444";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::try_init();

    let hot: HotRegions = Arc::new(Mutex::new(Vec::new()));

    tauri::Builder::default()
        .manage(hot.clone())
        .invoke_handler(tauri::generate_handler![get_usage, set_hot_regions])
        .setup(move |app| {
            let handle = app.handle().clone();
            let sessions: SessionMap = Arc::new(Mutex::new(HashMap::new()));

            if let Some(win) = app.get_webview_window("main") {
                win.on_window_event(|e| {
                    if let tauri::WindowEvent::CloseRequested { .. } = e {
                    }
                });
            }

            {
                let handle = handle.clone();
                let sessions = sessions.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = run_ws_server(handle, sessions).await {
                        log::error!("ws server exited: {e:?}");
                    }
                });
            }

            if let Some(win) = app.get_webview_window("main") {
                let hot = hot.clone();
                tauri::async_runtime::spawn(async move {
                    run_hit_test(win, hot).await;
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn run_ws_server(
    handle: tauri::AppHandle,
    sessions: SessionMap,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = tokio::net::TcpListener::bind(WS_ADDR).await?;
    log::info!("Hook WS server listening on ws://{WS_ADDR}");

    loop {
        let (stream, _) = match listener.accept().await {
            Ok(v) => v,
            Err(e) => {
                log::warn!("accept failed: {e}");
                continue;
            }
        };
        let sessions = sessions.clone();
        let handle = handle.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_client(stream, handle, sessions).await {
                log::debug!("client closed: {e}");
            }
        });
    }
}

async fn handle_client(
    stream: tokio::net::TcpStream,
    handle: tauri::AppHandle,
    sessions: SessionMap,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (mut write, mut read) = ws.split();

    {
        let s = sessions.lock().await;
        let snapshot: Vec<&HookEvent> = s.values().collect();
        let msg = serde_json::to_string(&snapshot)?;
        let _ = write.send(tokio_tungstenite::tungstenite::Message::Text(msg.into())).await;
    }

    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(m) => m,
            Err(_) => break,
        };
        let text = match msg {
            tokio_tungstenite::tungstenite::Message::Text(t) => t,
            tokio_tungstenite::tungstenite::Message::Close(_) => break,
            _ => continue,
        };

        let event: HookEvent = match serde_json::from_str(&text) {
            Ok(e) => e,
            Err(e) => {
                log::warn!("bad hook payload: {e}: {text}");
                continue;
            }
        };

        let sid = event.session_id().to_string();
        {
            let mut map = sessions.lock().await;
            match &event {
                HookEvent::SessionEnd { .. } => {
                    map.remove(&sid);
                }
                _ => {
                    map.insert(sid.clone(), event.clone());
                }
            }
        }

        if let Err(e) = handle.emit("hook-event", &event) {
            log::warn!("emit failed: {e}");
        }
    }

    Ok(())
}

fn read_claude_token() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not find home directory".to_string())?;
    let path = std::path::Path::new(&home).join(".claude").join(".credentials.json");
    let raw = std::fs::read_to_string(&path).map_err(|_|
        "Claude Code not logged in. Please run: claude auth login".to_string())?;
    let v: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|_| "Claude credentials file is corrupted".to_string())?;
    let oauth = v.get("claudeAiOauth").or_else(|| v.get("claude.ai_oauth"))
        .ok_or_else(|| "Claude credentials file is corrupted (missing oauth data)".to_string())?;
    oauth.get("accessToken")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Claude token missing. Please run: claude auth login".to_string())
}

#[tauri::command]
async fn get_usage() -> Result<UsageSnapshot, String> {
    let token = match read_claude_token() {
        Ok(t) => t,
        Err(e) => return Ok(UsageSnapshot { error: Some(e), ..Default::default() }),
    };

    let client = reqwest::Client::new();
    let resp = match client
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(&token)
        .header("anthropic-beta", "oauth-2025-04-20")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("api request failed: {e}");
            log::warn!("{msg}");
            return Ok(UsageSnapshot { error: Some(msg), ..Default::default() });
        }
    };

    let status = resp.status();
    let json = match resp.json::<serde_json::Value>().await {
        Ok(j) => j,
        Err(e) => {
            let msg = format!("parse response: {e}");
            log::warn!("{msg}");
            return Ok(UsageSnapshot { error: Some(msg), ..Default::default() });
        }
    };

    if !status.is_success() {
        let msg = format!("usage api {status}: {json}");
        log::warn!("{msg}");
        return Ok(UsageSnapshot { error: Some(msg), ..Default::default() });
    }

    log::debug!("usage api response: {}", serde_json::to_string_pretty(&json).unwrap_or_default());

    let parse_window = |obj: &serde_json::Value| -> UsageWindow {
        let pct = obj.get("utilization").and_then(|p| p.as_f64()).unwrap_or(0.0);
        let reset_in_minutes = obj
            .get("resets_at")
            .and_then(|s| s.as_str())
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| (dt.with_timezone(&chrono::Utc) - chrono::Utc::now()).num_minutes());
        UsageWindow { percent: pct.min(100.0), reset_in_minutes, ..Default::default() }
    };

    let mut snap = UsageSnapshot::default();
    if let Some(w) = json.get("five_hour").filter(|v| v.is_object()) {
        snap.five_hour = parse_window(w);
    }
    if let Some(w) = json.get("seven_day").filter(|v| v.is_object()) {
        snap.weekly = parse_window(w);
    }
    Ok(snap)
}

#[tauri::command]
async fn set_hot_regions(hot: tauri::State<'_, HotRegions>, rects: Vec<[f64; 4]>) -> Result<(), String> {
    *hot.lock().await = rects;
    Ok(())
}

async fn run_hit_test(window: tauri::WebviewWindow, hot: HotRegions) {
    let mut currently_ignore = false;
    let _ = window.set_ignore_cursor_events(true);
    let app = window.app_handle().clone();
    loop {
        tokio::time::sleep(Duration::from_millis(40)).await;
        let cursor = match app.cursor_position() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let wpos = match window.outer_position() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let scale = window.scale_factor().unwrap_or(1.0);
        let rx = (cursor.x - wpos.x as f64) / scale;
        let ry = (cursor.y - wpos.y as f64) / scale;

        let rects = hot.lock().await.clone();
        let inside = rects.iter().any(|r| {
            rx >= r[0] && rx <= r[0] + r[2] && ry >= r[1] && ry <= r[1] + r[3]
        });
        let should_ignore = !inside;
        if should_ignore != currently_ignore {
            let _ = window.set_ignore_cursor_events(should_ignore);
            currently_ignore = should_ignore;
        }
    }
}

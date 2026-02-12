use axum::{extract::Query, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

use crate::backend::api::config::ConfigCreateDto;
use crate::backend::error::AppError;

#[derive(Debug, Deserialize)]
pub struct UsageCheckQuery {
  pub uuid: String,
  pub resource_type: String,
}

#[derive(Debug, Serialize)]
pub struct ConfigUsageDto {
  pub uuid: String,
  pub name: String,
}

#[derive(Debug, Serialize)]
pub struct UsageCheckResponse {
  pub is_used: bool,
  pub used_by_configs: Vec<ConfigUsageDto>,
}

pub async fn check_resource_usage(
  Query(query): Query<UsageCheckQuery>,
) -> Result<impl IntoResponse, AppError> {
  let configs_dir = Path::new("./data/configs");

  let mut used_by_configs = Vec::new();

  // 如果 configs 目录不存在，则没有任何引用
  if !configs_dir.exists() {
    return Ok(Json(UsageCheckResponse {
      is_used: false,
      used_by_configs,
    }));
  }

  // 遍历所有 config 文件
  let mut entries = fs::read_dir(configs_dir).await?;

  while let Some(entry) = entries.next_entry().await? {
    let path = entry.path();
    if path.extension().and_then(|s| s.to_str()) == Some("json") {
      let content = fs::read_to_string(&path).await?;
      if let Ok(config) = serde_json::from_str::<ConfigCreateDto>(&content) {
        // 根据资源类型检查不同的字段
        let is_used_by_this_config = match query.resource_type.as_str() {
          "log" => config.log == query.uuid,
          "ruleset" => {
            // 检查 DNS rules 中的 rule_set
            let used_in_dns = config
              .dns
              .rules
              .as_ref()
              .map(|rules| rules.iter().any(|rule| rule.rule_set.contains(&query.uuid)))
              .unwrap_or(false);

            // 检查 route rules 中的 rulesets
            let used_in_route = config
              .route
              .rules
              .as_ref()
              .map(|rules| {
                rules.iter().any(|rule| match rule {
                  crate::backend::api::config::RouteRuleDto::Ruleset { rulesets, .. } => {
                    rulesets.contains(&query.uuid)
                  }
                  _ => false,
                })
              })
              .unwrap_or(false);

            used_in_dns || used_in_route
          }
          "inbound" => config.inbounds.contains(&query.uuid),
          "dns-server" => {
            // 检查 DNS servers 或 final server
            config.dns.servers.iter().any(|s| s.uuid == query.uuid)
              || config.dns.final_server == query.uuid
          }
          "dns-config" => config
            .dns
            .config
            .as_ref()
            .map(|c| c == &query.uuid)
            .unwrap_or(false),
          "route" => config
            .route
            .config
            .as_ref()
            .map(|c| c == &query.uuid)
            .unwrap_or(false),
          "experimental" => config.experimental == query.uuid,
          "outbound" => {
            // 检查 route.final 或 route.rules 中的 outbound
            let used_in_final = config.route.final_outbound == query.uuid;

            let used_in_rules = config
              .route
              .rules
              .as_ref()
              .map(|rules| {
                rules.iter().any(|rule| match rule {
                  crate::backend::api::config::RouteRuleDto::Ruleset { outbound, .. } => {
                    outbound == &query.uuid
                  }
                  crate::backend::api::config::RouteRuleDto::Rule { outbound, .. } => {
                    outbound.as_ref().map(|o| o == &query.uuid).unwrap_or(false)
                  }
                })
              })
              .unwrap_or(false);

            // 检查 DNS servers 的 detour
            let used_in_dns_detour = config
              .dns
              .servers
              .iter()
              .any(|s| s.detour.as_ref().map(|d| d == &query.uuid).unwrap_or(false));

            // 检查 ext_config.download_detour
            let used_in_download_detour = config.ext_config.download_detour == query.uuid;

            used_in_final || used_in_rules || used_in_dns_detour || used_in_download_detour
          }
          "rule" => {
            // 检查 route.rules 中的 rule
            config
              .route
              .rules
              .as_ref()
              .map(|rules| {
                rules.iter().any(|r| match r {
                  crate::backend::api::config::RouteRuleDto::Rule { rule, .. } => {
                    rule == &query.uuid
                  }
                  _ => false,
                })
              })
              .unwrap_or(false)
          }
          _ => false,
        };

        if is_used_by_this_config {
          used_by_configs.push(ConfigUsageDto {
            uuid: config.uuid,
            name: config.name,
          });
        }
      }
    }
  }

  Ok(Json(UsageCheckResponse {
    is_used: !used_by_configs.is_empty(),
    used_by_configs,
  }))
}

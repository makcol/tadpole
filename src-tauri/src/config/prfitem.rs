use crate::utils::{dirs, help, tmpl};
use anyhow::{bail, Context, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_yaml::Mapping;
use std::fs;
use sysproxy::Sysproxy;

use super::Config;

use block_modes::{BlockMode, Cbc};
use block_modes::block_padding::Pkcs7;
use aes::Aes128;
use base64::decode;
use chrono::{DateTime, NaiveDateTime, Utc};
use serde_json::{Value};
use tauri::regex::internal::Input;
use rand::seq::SliceRandom;

type Aes128Cbc = Cbc<Aes128, Pkcs7>;

use surge_ping::{Client, Config as PingConfig, PingIdentifier, ICMP};
use std::net::IpAddr;
use crate::utils::sping;

const URL_LIST: [&str; 11] = [
    "https://gitee.com/api/v5/repos/crosserr/tp/contents/config_encrypt?access_token=856ec1e2613d8c17d7912f538321418c&ref=hotfix",
    "https://gitee.com/api/v5/repos/c0nfigway/tp/contents/config_encrypt?access_token=40c9d0c63121b9c3ff04a49e6a31d986&ref=hotfix",
    "https://jihulab.com/c0nfigway/tp/-/raw/hotfix/config_encrypt",
    "https://raw.gitcode.com/configway/tp/raw/hotfix/config_encrypt",
    "https://bitbucket.org/api/2.0/repositories/c0nfigway/tp/src/hotfix/config_encrypt",
    "https://gitlab.com/c0nfigway/tp/-/raw/hotfix/config_encrypt",
    "https://gitea.com/configway/tp/raw/branch/hotfix/config_encrypt",
    "https://codeberg.org/configway/tp/raw/branch/hotfix/config_encrypt",
    "https://ghproxy.com/https://raw.githubusercontent.com/configway/tp/hotfix/config_encrypt",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com/configway/tp/hotfix/config_encrypt",
    "https://raw.githubusercontent.com/configway/tp/hotfix/config_encrypt"
];
const VIP_URL_LIST: [&str; 11] = [
    "https://gitee.com/api/v5/repos/crosserr/tp/contents/config_vip_encrypt?access_token=856ec1e2613d8c17d7912f538321418c&ref=hotfix",
    "https://gitee.com/api/v5/repos/c0nfigway/tp/contents/config_vip_encrypt?access_token=40c9d0c63121b9c3ff04a49e6a31d986&ref=hotfix",
    "https://jihulab.com/c0nfigway/tp/-/raw/hotfix/config_vip_encrypt",
    "https://raw.gitcode.com/configway/tp/raw/hotfix/config_vip_encrypt",
    "https://bitbucket.org/api/2.0/repositories/c0nfigway/tp/src/hotfix/config_vip_encrypt",
    "https://gitlab.com/c0nfigway/tp/-/raw/hotfix/config_vip_encrypt",
    "https://gitea.com/configway/tp/raw/branch/hotfix/config_vip_encrypt",
    "https://codeberg.org/configway/tp/raw/branch/hotfix/config_vip_encrypt",
    "https://ghproxy.com/https://raw.githubusercontent.com/configway/tp/hotfix/config_vip_encrypt",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com/configway/tp/hotfix/config_vip_encrypt",
    "https://raw.githubusercontent.com/configway/tp/hotfix/config_vip_encrypt"
];
const IPS_LIST: [&str; 11] = [
    "https://gitee.com/api/v5/repos/crosserr/tp/contents/ip_encrypt?access_token=856ec1e2613d8c17d7912f538321418c&ref=hotfix",
    "https://gitee.com/api/v5/repos/c0nfigway/tp/contents/ip_encrypt?access_token=40c9d0c63121b9c3ff04a49e6a31d986&ref=hotfix",
    "https://jihulab.com/c0nfigway/tp/-/raw/hotfix/ip_encrypt",
    "https://raw.gitcode.com/configway/tp/raw/hotfix/ip_encrypt",
    "https://bitbucket.org/api/2.0/repositories/c0nfigway/tp/src/hotfix/ip_encrypt",
    "https://gitlab.com/c0nfigway/tp/-/raw/hotfix/ip_encrypt",
    "https://gitea.com/configway/tp/raw/branch/hotfix/ip_encrypt",
    "https://codeberg.org/configway/tp/raw/branch/hotfix/ip_encrypt",
    "https://ghproxy.com/https://raw.githubusercontent.com/configway/tp/hotfix/ip_encrypt",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com/configway/tp/hotfix/ip_encrypt",
    "https://raw.githubusercontent.com/configway/tp/hotfix/ip_encrypt"
];

const BASE_URL_LIST: [&str; 4] = [
    "https://cdn05042023.gitlink.org.cn/api/v1/repos/configshare/studyshare/raw/DOMAINS",
    "https://bitbucket.org/api/2.0/repositories/configshareworkk/foxovpn/src/main/DOMAINS",
    "https://gh.api.99988866.xyz/https://raw.githubusercontent.com/Pawdroid/FoxoVPN/main/DOMAINS",
    "https://raw.githubusercontent.com/Pawdroid/FoxoVPN/main/DOMAINS"
];

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PrfItem {
    pub uid: Option<String>,

    /// profile item type
    /// enum value: remote | local | script | merge
    #[serde(rename = "type")]
    pub itype: Option<String>,

    /// profile name
    pub name: Option<String>,

    /// profile file
    pub file: Option<String>,

    /// profile description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desc: Option<String>,

    /// source url
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// selected information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected: Option<Vec<PrfSelected>>,

    /// subscription user info
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra: Option<PrfExtra>,

    /// updated time
    pub updated: Option<usize>,

    /// some options of the item
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option: Option<PrfOption>,

    /// the file data
    #[serde(skip)]
    pub file_data: Option<String>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize)]
pub struct PrfSelected {
    pub name: Option<String>,
    pub now: Option<String>,
}

#[derive(Default, Debug, Clone, Copy, Deserialize, Serialize)]
pub struct PrfExtra {
    pub upload: usize,
    pub download: usize,
    pub total: usize,
    pub expire: usize,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct PrfOption {
    /// for `remote` profile's http request
    /// see issue #13
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,

    /// for `remote` profile
    /// use system proxy
    #[serde(skip_serializing_if = "Option::is_none")]
    pub with_proxy: Option<bool>,

    /// for `remote` profile
    /// use self proxy
    #[serde(skip_serializing_if = "Option::is_none")]
    pub self_proxy: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_interval: Option<u64>,
}

impl PrfOption {
    pub fn merge(one: Option<Self>, other: Option<Self>) -> Option<Self> {
        match (one, other) {
            (Some(mut a), Some(b)) => {
                a.user_agent = b.user_agent.or(a.user_agent);
                a.with_proxy = b.with_proxy.or(a.with_proxy);
                a.self_proxy = b.self_proxy.or(a.self_proxy);
                a.update_interval = b.update_interval.or(a.update_interval);
                Some(a)
            }
            t @ _ => t.0.or(t.1),
        }
    }
}

impl Default for PrfItem {
    fn default() -> Self {
        PrfItem {
            uid: None,
            itype: None,
            name: None,
            desc: None,
            file: None,
            url: None,
            selected: None,
            extra: None,
            updated: None,
            option: None,
            file_data: None,
        }
    }
}

impl PrfItem {
    /// From partial item
    /// must contain `itype`
    pub async fn from(item: PrfItem, file_data: Option<String>) -> Result<PrfItem> {
        if item.itype.is_none() {
            bail!("type should not be null");
        }

        match item.itype.unwrap().as_str() {
            "remote" => {
                if item.url.is_none() {
                    bail!("url should not be null");
                }
                let url = item.url.as_ref().unwrap().as_str();
                let name = item.name;
                let desc = item.desc;
                PrfItem::from_url(url, name, desc, item.option).await
            }
            "local" => {
                let name = item.name.unwrap_or("Local File".into());
                let desc = item.desc.unwrap_or("".into());
                PrfItem::from_local(name, desc, file_data)
            }
            "merge" => {
                let name = item.name.unwrap_or("Merge".into());
                let desc = item.desc.unwrap_or("".into());
                PrfItem::from_merge(name, desc)
            }
            "script" => {
                let name = item.name.unwrap_or("Script".into());
                let desc = item.desc.unwrap_or("".into());
                PrfItem::from_script(name, desc)
            }
            typ @ _ => bail!("invalid profile item type \"{typ}\""),
        }
    }

    /// ## Local type
    /// create a new item from name/desc
    pub fn from_local(name: String, desc: String, file_data: Option<String>) -> Result<PrfItem> {
        let uid = help::get_uid("l");
        let file = format!("{uid}.yaml");

        Ok(PrfItem {
            uid: Some(uid),
            itype: Some("local".into()),
            name: Some(name),
            desc: Some(desc),
            file: Some(file),
            url: None,
            selected: None,
            extra: None,
            option: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            file_data: Some(file_data.unwrap_or(tmpl::ITEM_LOCAL.into())),
        })
    }

    /// ## Remote type
    /// create a new item from url
    pub async fn from_url(
        url: &str,
        name: Option<String>,
        desc: Option<String>,
        option: Option<PrfOption>,
    ) -> Result<PrfItem> {
        let opt_ref = option.as_ref();
        let with_proxy = opt_ref.map_or(false, |o| o.with_proxy.unwrap_or(false));
        let self_proxy = opt_ref.map_or(false, |o| o.self_proxy.unwrap_or(false));
        let user_agent = opt_ref.map_or(None, |o| o.user_agent.clone());

        let mut builder = reqwest::ClientBuilder::new().use_rustls_tls().no_proxy();

        // 使用软件自己的代理
        if self_proxy {
            let port = Config::clash().data().get_mixed_port();

            let proxy_scheme = format!("http://127.0.0.1:{port}");

            if let Ok(proxy) = reqwest::Proxy::http(&proxy_scheme) {
                builder = builder.proxy(proxy);
            }
            if let Ok(proxy) = reqwest::Proxy::https(&proxy_scheme) {
                builder = builder.proxy(proxy);
            }
            if let Ok(proxy) = reqwest::Proxy::all(&proxy_scheme) {
                builder = builder.proxy(proxy);
            }
        }
        // 使用系统代理
        else if with_proxy {
            match Sysproxy::get_system_proxy() {
                Ok(p @ Sysproxy { enable: true, .. }) => {
                    let proxy_scheme = format!("http://{}:{}", p.host, p.port);

                    if let Ok(proxy) = reqwest::Proxy::http(&proxy_scheme) {
                        builder = builder.proxy(proxy);
                    }
                    if let Ok(proxy) = reqwest::Proxy::https(&proxy_scheme) {
                        builder = builder.proxy(proxy);
                    }
                    if let Ok(proxy) = reqwest::Proxy::all(&proxy_scheme) {
                        builder = builder.proxy(proxy);
                    }
                }
                _ => {}
            };
        }

        let version = unsafe { dirs::APP_VERSION };
        let version = format!("clash-verge/{version}");
        builder = builder.user_agent(user_agent.unwrap_or(version));

        let resp = builder.build()?.get(url).send().await?;

        let status_code = resp.status();
        if !StatusCode::is_success(&status_code) {
            bail!("failed to fetch remote profile with status {status_code}")
        }

        let header = resp.headers();

        // parse the Subscription UserInfo
        let extra = match header.get("Subscription-Userinfo") {
            Some(value) => {
                let sub_info = value.to_str().unwrap_or("");

                Some(PrfExtra {
                    upload: help::parse_str(sub_info, "upload=").unwrap_or(0),
                    download: help::parse_str(sub_info, "download=").unwrap_or(0),
                    total: help::parse_str(sub_info, "total=").unwrap_or(0),
                    expire: help::parse_str(sub_info, "expire=").unwrap_or(0),
                })
            }
            None => None,
        };

        // parse the Content-Disposition
        let filename = match header.get("Content-Disposition") {
            Some(value) => {
                let filename = value.to_str().unwrap_or("");
                help::parse_str::<String>(filename, "filename=")
            }
            None => None,
        };

        // parse the profile-update-interval
        let option = match header.get("profile-update-interval") {
            Some(value) => match value.to_str().unwrap_or("").parse::<u64>() {
                Ok(val) => Some(PrfOption {
                    update_interval: Some(val * 60), // hour -> min
                    ..PrfOption::default()
                }),
                Err(_) => None,
            },
            None => None,
        };

        let uid = help::get_uid("r");
        let file = format!("{uid}.yaml");
        let name = name.unwrap_or(filename.unwrap_or("Remote File".into()));
        let data = resp.text_with_charset("utf-8").await?;

        // process the charset "UTF-8 with BOM"
        let data = data.trim_start_matches('\u{feff}');

        // check the data whether the valid yaml format
        let yaml = serde_yaml::from_str::<Mapping>(data)
            .context("the remote profile data is invalid yaml")?;

        if !yaml.contains_key("proxies") && !yaml.contains_key("proxy-providers") {
            bail!("profile does not contain `proxies` or `proxy-providers`");
        }

        Ok(PrfItem {
            uid: Some(uid),
            itype: Some("remote".into()),
            name: Some(name),
            desc,
            file: Some(file),
            url: Some(url.into()),
            selected: None,
            extra,
            option,
            updated: Some(chrono::Local::now().timestamp() as usize),
            file_data: Some(data.into()),
        })
    }

    async fn get_ips() -> Option<String> {
        let mut builder = reqwest::ClientBuilder::new().use_rustls_tls().no_proxy();

        let version = unsafe { dirs::APP_VERSION };
        let version = format!("tadpole/{version}");
        builder = builder.user_agent(version);
        let b = builder.build().ok()?;

        let mut encrypt: String = String::from("");

        for url in IPS_LIST {
            let res = b.get(url).send().await.ok()?;
            match res.status() {
                StatusCode::OK => {
                    if url == IPS_LIST[0] {
                        let result = res.text().await.ok()?;
                        let parsed: Value = serde_json::from_str(&result).unwrap();
                        let content_base64 = parsed["content"].as_str().unwrap_or_default();

                        let content_decoded_bytes = decode(&content_base64).ok()?;
                        encrypt = String::from_utf8(content_decoded_bytes).ok()?;
                    } else if url == IPS_LIST[1] {
                        let result = res.text().await.ok()?;
                        let parsed: Value = serde_json::from_str(&result).unwrap();
                        let content_base64 = parsed["content"].as_str().unwrap_or_default();

                        let content_decoded_bytes = decode(&content_base64).ok()?;
                        encrypt = String::from_utf8(content_decoded_bytes).ok()?;
                    } else {
                        encrypt = res.text_with_charset("utf-8").await.ok()?;
                    }
                    break;
                }
                _ => continue,
            }
        }

        let key = b"8YfiQ8wrkziZ5YFa"; // your key
        let iv = b"8YfiQ8wrkziZ5YFa"; // initialization vector

        let bytes = base64::decode(encrypt).unwrap();

        let cipher = Aes128Cbc::new_from_slices(key, iv).unwrap();
        let decrypted_data = String::from_utf8(cipher.decrypt_vec(&bytes).unwrap()).unwrap();

        // process the charset "UTF-8 with BOM"
        let data = decrypted_data.trim_start_matches('\u{feff}');

        return Some(String::from(data));
    }

    async fn test_ip(ip_with_port: &str) -> bool {
       return  true;
        // let ip_parts: Vec<&str> = ip_with_port.split(':').collect();
        // let ip = ip_parts[0];
        // let ip_to_ping: IpAddr = ip.parse().unwrap();
        // let client = Client::new(&PingConfig::default()).unwrap();
        // let pinger = client.pinger(ip_to_ping, PingIdentifier(1)).await;
        // let result = sping::ping(ip_to_ping, pinger).await;
        // return match result {
        //     Ok((_, duration)) => {
        //         // 将 Duration 转换为毫秒数
        //         let milliseconds = duration.as_millis() as u64;
        //         milliseconds < 300
        //     }
        //     Err(err) => {
        //         false
        //     }
        // };
    }


    pub async fn from_free_url(vip: bool) -> Result<PrfItem> {
        let mut builder = reqwest::ClientBuilder::new().use_rustls_tls().no_proxy();

        let version = unsafe { dirs::APP_VERSION };
        let version = format!("tadpole/{version}");
        builder = builder.user_agent(version);
        let b = builder.build()?;

        let mut encrypt: String = String::from("");

        if vip {
            for url in VIP_URL_LIST {
                let res = b.get(url).send().await?;
                match res.status() {
                    StatusCode::OK => {
                        if url == VIP_URL_LIST[0] {
                            let result = res.text().await?;
                            let parsed: Value = serde_json::from_str(&result).unwrap();
                            let content_base64 = parsed["content"].as_str().unwrap_or_default();

                            let content_decoded_bytes = decode(&content_base64)?;
                            encrypt = String::from_utf8(content_decoded_bytes)?;
                        } else if url == VIP_URL_LIST[1] {
                            let result = res.text().await?;
                            let parsed: Value = serde_json::from_str(&result).unwrap();
                            let content_base64 = parsed["content"].as_str().unwrap_or_default();

                            let content_decoded_bytes = decode(&content_base64)?;
                            encrypt = String::from_utf8(content_decoded_bytes)?;
                        } else {
                            encrypt = res.text_with_charset("utf-8").await?;
                        }
                        break;
                    }
                    _ => continue,
                }
            }
        } else {
            for url in URL_LIST {
                let res = b.get(url).send().await?;
                match res.status() {
                    StatusCode::OK => {
                        if url == URL_LIST[0] {
                            let result = res.text().await?;
                            let parsed: Value = serde_json::from_str(&result).unwrap();
                            let content_base64 = parsed["content"].as_str().unwrap_or_default();

                            let content_decoded_bytes = decode(&content_base64)?;
                            encrypt = String::from_utf8(content_decoded_bytes)?;
                        } else if url == URL_LIST[1] {
                            let result = res.text().await?;
                            let parsed: Value = serde_json::from_str(&result).unwrap();
                            let content_base64 = parsed["content"].as_str().unwrap_or_default();

                            let content_decoded_bytes = decode(&content_base64)?;
                            encrypt = String::from_utf8(content_decoded_bytes)?;
                        } else {
                            encrypt = res.text_with_charset("utf-8").await?;
                        }
                        break;
                    }
                    _ => continue,
                }
            }
        }

        let uid = "CACHEDIR".to_string();
        let file = format!("{uid}.TAG");
        let name = "all_profiles".into();

        let key = b"8YfiQ8wrkziZ5YFa"; // your key
        let iv = b"8YfiQ8wrkziZ5YFa"; // initialization vector

        let bytes = base64::decode(encrypt).unwrap();

        let cipher = Aes128Cbc::new_from_slices(key, iv).unwrap();
        let decrypted_data = String::from_utf8(cipher.decrypt_vec(&bytes).unwrap()).unwrap();

        // process the charset "UTF-8 with BOM"
        let mut data = String::from(decrypted_data.trim_start_matches('\u{feff}'));

        // check the data whether the valid yaml format
        let yaml = serde_yaml::from_str::<Mapping>(&data)
            .context("the remote profile data is invalid yaml")?;

        if !yaml.contains_key("proxies") && !yaml.contains_key("proxy-providers") {
            bail!("profile does not contain `proxies` or `proxy-providers`");
        }

        let ips = Self::get_ips();

        let mut string_list: Vec<String> = Vec::new();

        let mut available_count = 0;
        let ip_list = ips.await.unwrap();
        let mut lines: Vec<&str> = ip_list.lines().collect();
        lines.shuffle(&mut rand::thread_rng());
        for ip in lines {
            if Self::test_ip(ip).await {
                available_count += 1;
                string_list.push(String::from(ip));
                println!("{}", ip);
                if available_count >= 4 {
                    println!("4 available IPs found. Stopping the test.");
                    break;
                }
            }
        }

        let s1 = &mut string_list[0].split(':');
        if let Some(first) = s1.next() {
            data = data.replace("line1", first)
        }
        if let Some(second) = s1.next() {
            data = data.replace("port1", second)
        }
        let s2 = &mut string_list[1].split(':');
        if let Some(first) = s2.next() {
            data = data.replace("line2", first)
        }
        if let Some(second) = s2.next() {
            data = data.replace("port2", second)
        }
        let s3 = &mut string_list[2].split(':');
        if let Some(first) = s3.next() {
            data = data.replace("line3", first)
        }
        if let Some(second) = s3.next() {
            data = data.replace("port3", second)
        }
        let s4 = &mut string_list[3].split(':');
        if let Some(first) = s4.next() {
            data = data.replace("line4", first)
        }
        if let Some(second) = s4.next() {
            data = data.replace("port4", second)
        }

        Ok(PrfItem {
            uid: Some(uid),
            itype: Some("remote".into()),
            name: Some(name),
            file: Some(file),
            desc: None,
            url: Some("".into()),
            selected: None,
            extra: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            option: None,
            file_data: Some(data.into()),
        })
    }


    pub async fn get_base_url() -> Result<PrfItem> {
        let mut builder = reqwest::ClientBuilder::new().use_rustls_tls().no_proxy();

        let version = unsafe { dirs::APP_VERSION };
        let version = format!("tadpole/{version}");
        builder = builder.user_agent(version);
        let b = builder.build()?;

        let mut encrypt: String = String::from("https://vip.foxovpn.com");

        for url in BASE_URL_LIST {
            let res = b.get(url).send().await?;
            match res.status() {
                StatusCode::OK => {
                    encrypt = res.text_with_charset("utf-8").await?;
                    break;
                }
                _ => continue,
            }
        }

        // process the charset "UTF-8 with BOM"
        let url = encrypt.trim_start_matches('\u{feff}');
        let r = format!("{url}");
        Ok(PrfItem {
            uid: None,
            itype: Some("remote".into()),
            name: None,
            file: None,
            desc: None,
            url: Some(r.into()),
            selected: None,
            extra: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            option: None,
            file_data: None,
        })
    }

    pub async fn get_apple_time() -> Result<PrfItem> {
        let mut builder = reqwest::ClientBuilder::new().use_rustls_tls().no_proxy();

        let version = unsafe { dirs::APP_VERSION };
        let version = format!("foxovpn/{version}");
        builder = builder.user_agent(version);
        let b = builder.build()?;

        let mut encrypt: String = String::from("https://vip.foxovpn.com");

        let response = b.get("http://www.apple.com").send().await?;
        let date_header = response.headers().get("date").unwrap().to_str().unwrap();

        let parsed_date = DateTime::parse_from_rfc2822(date_header).unwrap();
        let timestamp = parsed_date.format("%Y-%m-%d %H:%M:%S").to_string();
        let r = format!("{timestamp}");

        Ok(PrfItem {
            uid: None,
            itype: Some("remote".into()),
            name: None,
            file: None,
            desc: None,
            url: Some(r.into()),
            selected: None,
            extra: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            option: None,
            file_data: None,
        })
    }


    /// ## Merge type (enhance)
    /// create the enhanced item by using `merge` rule
    pub fn from_merge(name: String, desc: String) -> Result<PrfItem> {
        let uid = help::get_uid("m");
        let file = format!("{uid}.yaml");

        Ok(PrfItem {
            uid: Some(uid),
            itype: Some("merge".into()),
            name: Some(name),
            desc: Some(desc),
            file: Some(file),
            url: None,
            selected: None,
            extra: None,
            option: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            file_data: Some(tmpl::ITEM_MERGE.into()),
        })
    }

    /// ## Script type (enhance)
    /// create the enhanced item by using javascript quick.js
    pub fn from_script(name: String, desc: String) -> Result<PrfItem> {
        let uid = help::get_uid("s");
        let file = format!("{uid}.js"); // js ext

        Ok(PrfItem {
            uid: Some(uid),
            itype: Some("script".into()),
            name: Some(name),
            desc: Some(desc),
            file: Some(file),
            url: None,
            selected: None,
            extra: None,
            option: None,
            updated: Some(chrono::Local::now().timestamp() as usize),
            file_data: Some(tmpl::ITEM_SCRIPT.into()),
        })
    }

    /// get the file data
    pub fn read_file(&self) -> Result<String> {
        if self.file.is_none() {
            bail!("could not find the file");
        }

        let file = self.file.clone().unwrap();
        let path = dirs::app_profiles_dir()?.join(file);
        fs::read_to_string(path).context("failed to read the file")
    }

    /// save the file data
    pub fn save_file(&self, data: String) -> Result<()> {
        if self.file.is_none() {
            bail!("could not find the file");
        }

        let file = self.file.clone().unwrap();
        let path = dirs::app_profiles_dir()?.join(file);
        fs::write(path, data.as_bytes()).context("failed to save the file")
    }
}

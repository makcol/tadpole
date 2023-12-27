import useSWR, { mutate } from "swr";
import { useEffect, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { Box, IconButton } from "@mui/material";
import {
  InputOutlined,
  LocalFireDepartmentRounded,
  RefreshRounded,
  TextSnippetOutlined,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  deleteProfile,
  disableSystemProxy,
  enableSystemProxy,
  enhanceProfiles,
  getBaseUrl,
  getConfigText,
  getProfiles,
  getRuntimeLogs,
  openWebUrl,
  refreshUserInfo,
} from "@/services/cmds";

import { BasePage, DialogRef, Notice } from "@/components/base";

import { useProfiles } from "@/hooks/use-profiles";
import axios from "axios";
import LSUtil from "@/utils/local-storage-util";

import worldImage from "@/assets/image/mapworld.png";
import { ReactComponent as ConnectOn } from "@/assets/image/connect_on.svg";
import { ReactComponent as ConnectOff } from "@/assets/image/connect_off.svg";
import { useVerge } from "@/hooks/use-verge";
import { CodeViewer } from "@/components/setting/mods/code-viewer";

const ProfilePage = () => {
  const { t } = useTranslation();

  const [connected, setConnected] = useState(false);
  const [restTime, setRestTime] = useState("检查试用状态中...");
  const { verge, mutateVerge, patchVerge } = useVerge();
  const codeRef = useRef<DialogRef>(null);

  const {
    profiles = {},
    activateSelected,
    patchProfiles,
    mutateProfiles,
  } = useProfiles();

  const { data: chainLogs = {}, mutate: mutateLogs } = useSWR(
    "getRuntimeLogs",
    getRuntimeLogs
  );

  const configRef = useRef<DialogRef>(null);
  const { enable_system_proxy } = verge ?? {};

  useEffect(() => {
    if (LSUtil.isNeedUpdate()) {
      onUpdateFree().then((r) => {});
    }
    setConnected(enable_system_proxy || false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const tryTime = LSUtil.getTryTime();
      if (tryTime > Date.now()) {
        if (LSUtil.isVIP()) {
          setRestTime("VIP用户不限制使用");
        } else
          setRestTime(formatTime(Math.floor((tryTime - Date.now()) / 1000)));
      } else {
        setRestTime("未开始试用");
        disableSystemProxy();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function formatTime(seconds: number): string {
    const hours: number = Math.floor(seconds / 3600);
    const minutes: number = Math.floor((seconds % 3600) / 60);
    const remainingSeconds: number = seconds % 60;

    return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
  }

  function padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  async function getInfo(): Promise<any> {
    let baseUrl = LSUtil.getBaseUrl();
    if (baseUrl == null) {
      baseUrl = await getBaseUrl();
      if (baseUrl == null) {
        baseUrl = "https://vip.foxovpn.com";
      }
      LSUtil.setBaseUrl(baseUrl);
    }
    try {
      const response = await axios.get(baseUrl + "/sys/user/sysInfo", {
        headers: { token: LSUtil.getToken() },
      });
      return response.data; // 返回登录成功后的用户数据
    } catch (error) {
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }

  const onUpdateFree = useLockFn(async () => {
    if (!LSUtil.isVIP() && !LSUtil.isNeedUpdate()) {
      Notice.error("非VIP用户每天仅可随机更新一次线路IP");
      return;
    }

    Notice.info("正在获取最新节点，请耐心等待", 3000);
    getInfo()
      .then(async (result) => {
        if (result.code == 0) {
          localStorage.setItem("expiredTime", result.data.userInfo.expiredTime);
          localStorage.setItem("userName", result.data.userInfo.userName);
          localStorage.setItem("vip", result.data.userInfo.vip);

          try {
            await deleteProfile("CACHEDIR");

            await getConfigText(result.data.userInfo.vip);
            Notice.success("节点更新成功！");
            getProfiles().then((newProfiles) => {
              mutate("getProfiles", newProfiles);

              const remoteItem = newProfiles.items?.find(
                (e) => e.type === "remote"
              );
              if (!newProfiles.current && remoteItem) {
                const current = remoteItem.uid;
                patchProfiles({ current });
                mutateLogs();
                LSUtil.setNeedUpdate();
                setTimeout(() => activateSelected(), 2000);
              }
            });
          } catch (err: any) {
            Notice.error(err.message || err.toString());
          } finally {
          }
        } else {
          localStorage.removeItem("token");

          try {
            await deleteProfile("CACHEDIR");

            await getConfigText(false);
            Notice.success("节点更新成功！");

            getProfiles().then((newProfiles) => {
              mutate("getProfiles", newProfiles);

              const remoteItem = newProfiles.items?.find(
                (e) => e.type === "remote"
              );
              if (!newProfiles.current && remoteItem) {
                const current = remoteItem.uid;
                patchProfiles({ current });
                mutateLogs();
                LSUtil.setNeedUpdate();
                setTimeout(() => activateSelected(), 2000);
              }
            });
          } catch (err: any) {
            Notice.error(err.message || err.toString());
          } finally {
          }
        }
      })
      .catch(async () => {
        try {
          await deleteProfile("CACHEDIR");

          await getConfigText(false);
          Notice.success("节点更新成功！");

          getProfiles().then((newProfiles) => {
            mutate("getProfiles", newProfiles);

            const remoteItem = newProfiles.items?.find(
              (e) => e.type === "remote"
            );
            if (!newProfiles.current && remoteItem) {
              const current = remoteItem.uid;
              patchProfiles({ current });
              mutateLogs();
              LSUtil.setNeedUpdate();
              setTimeout(() => activateSelected(), 2000);
            }
          });
        } catch (err: any) {
          Notice.error(err.message || err.toString());
        } finally {
        }
      });
  });

  return (
    <BasePage
      header={
        <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <p>{t("Update All Profiles")}</p>
          <IconButton
            size="small"
            color="inherit"
            title={t("Update All Profiles")}
            onClick={onUpdateFree}
          >
            <RefreshRounded />
          </IconButton>

          {/*<IconButton*/}
          {/*  size="small"*/}
          {/*  color="primary"*/}
          {/*  title={t("Reactivate Profiles")}*/}
          {/*  onClick={onEnhance}*/}
          {/*>*/}
          {/*  <LocalFireDepartmentRounded />*/}
          {/*</IconButton>*/}
        </Box>
      }
    >
      <img
        style={{ width: "100%", height: "45%", minHeight: 200 }}
        src={worldImage}
        alt=""
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 100,
          marginTop: 20,
        }}
      >
        {connected && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ConnectOn
              style={{ height: 150, width: 150 }}
              onClick={() =>
                disableSystemProxy().then((r) => setConnected(false))
              }
            />
            <p>已连接</p>
          </div>
        )}
        {!connected && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ConnectOff
              style={{ height: 150, width: 150 }}
              onClick={() => {
                if (LSUtil.getTryTime() - Date.now() <= 0) {
                  Notice.error("请先开始试用");
                } else {
                  enableSystemProxy().then((r) => setConnected(true));
                }
              }}
            />
            <p>点击连接</p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <p>试用到期时间</p>
          <p style={{ fontSize: 25, color: "#434343" }}>{restTime}</p>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <p>点击查看并输入免费试用激活码</p>
            <IconButton
              size="small"
              color="inherit"
              title={t("getCode")}
              onClick={() => {
                codeRef?.current?.open();
              }}
            >
              <InputOutlined />
            </IconButton>
          </div>
        </div>
      </div>
      <CodeViewer ref={codeRef} />
    </BasePage>
  );
};

export default ProfilePage;

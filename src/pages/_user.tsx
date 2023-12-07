import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { listen } from "@tauri-apps/api/event";

import { useVerge } from "@/hooks/use-verge";
import { BaseErrorBoundary, BasePage, DialogRef, Notice } from "@/components/base";
import getSystem from "@/utils/get-system";
import "dayjs/locale/zh-cn";
import axios from "axios";
import {
  deleteProfile, disableSystemProxy,
  getBaseUrl,
  logoutRs,
  refreshUserInfo
} from "@/services/cmds";
import disableImage from "@/assets/image/vip_card_disable.png";
import enableImage from "@/assets/image/vip_card_enable.png";
import { LoginViewer } from "@/components/setting/mods/login-viewer";
import { useCustomTheme } from "@/components/layout/use-custom-theme";
import LSUtil from "@/utils/local-storage-util";
import { getData } from "@/utils/net-util";
import { BuyViewer } from "@/components/setting/mods/buy-viewer";

dayjs.extend(relativeTime);

const OS = getSystem();

const UserPage = () => {
  const { t } = useTranslation();

  const { theme } = useCustomTheme();

  const { verge } = useVerge();
  const { theme_blur, language } = verge || {};

  const [isVIP, setIsVIP] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [expiredTime, setExpiredTime] = useState("已到期");
  const [userName, setUserName] = useState("");
  const loginRef = useRef<DialogRef>(null);
  const buyRef = useRef<DialogRef>(null);

  const openLogin = async () => {
    loginRef.current?.open();
  };

  async function logout(): Promise<any> {
    Notice.info("正在退出登陆，请稍后");
    try {
      let device = "Windows";
      switch (OS) {
        case "macos":
          device = "MacOS";
          break;
        case "windows":
          device = "Windows";
          break;
        case "linux":
          device = "Linux";
          break;
        case "unknown":
          break;
      }
      let baseUrl = LSUtil.getBaseUrl();
      if (baseUrl == null) {
        baseUrl = await getBaseUrl();
        if (baseUrl == null) {
          baseUrl = "https://vip.foxovpn.com";
        }
        LSUtil.setBaseUrl(baseUrl);
      }
      const response = await getData(baseUrl + "/sys/device/logout?device=" + device);
      if (response.data.code == 0 || response.data.msg == "未登录" || response.data.code == 401) {
        await logoutRs();
      } else {
        await logoutRs();
      }
    } catch (error) {
      await logoutRs();
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }

  const buyVIP = async () => {

    buyRef.current?.open();

  };

  async function getInfo(): Promise<any> {

    const baseUrl = await getBaseUrl();
    LSUtil.setBaseUrl(baseUrl);

    try {
      const response = await getData(baseUrl + "/sys/user/sysInfo");
      return response.data; // 返回登录成功后的用户数据
    } catch (error) {
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }

  async function getHomeBaseUrl(): Promise<any> {
    const baseUrl = await getBaseUrl();
    LSUtil.setBaseUrl(baseUrl);
  }

  useEffect(() => {

    listen("verge://logout", async () => {
      LSUtil.clear();
      await refreshUserInfo();
    });

    listen("verge://refresh_userinfo", async () => {
      const token = LSUtil.getToken();
      if (token != null) {
        setIsLogin(true);
      } else {
        setIsLogin(false);
      }
      const userName = LSUtil.getUserName();
      if (userName != null) {
        setUserName(userName);
      }
      const expiredTime = LSUtil.getExpiredTime();
      if (expiredTime != null) {
        setExpiredTime(expiredTime);
      }
      const vip = LSUtil.isVIP();
      if (vip != null) {
        setIsVIP(vip);
      }
    });

  }, []);

  let isLoading = false
  useEffect(() => {

    if (isLoading) {
      isLoading = false;
      return;
    }
    isLoading = true;
    getHomeBaseUrl().then();

    if (LSUtil.getToken()) {
      Notice.info("检查登陆状态...");
    } else {
      return;
    }

    getInfo()
      .then(async (result) => {

        if (result.code == 0) {
          setIsLogin(true);
          const expiredTime = result.data.userInfo.expiredTime;
          setExpiredTime(expiredTime);
          const userName = result.data.userInfo.userName;
          setUserName(userName);
          const vip = result.data.userInfo.vip;
          setIsVIP(vip);

          LSUtil.setExpiredTime(expiredTime);
          LSUtil.setUserName(userName);
          LSUtil.setVIP(vip);

        } else if (result.code == 401) {
          setIsLogin(false);
          Notice.error("登陆已过期");
          localStorage.removeItem("token");
        }
      })
      .catch(() => {
      });
  }, []);

  return (
    <BasePage>
      <LoginViewer ref={loginRef} />
      <BuyViewer ref={buyRef} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1>欢迎使用蝌蚪VPN</h1>

        {isLogin && (
          <div  style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ textAlign: "center", marginTop: 5 }}>
              {isVIP && (
                <img
                  style={{ width: 51, height: 51 }}
                  src={enableImage}
                />
              )}
              {!isVIP && (
                <img
                  style={{ width: 51, height: 51 }}
                  src={disableImage}
                />
              )}
            </div>
            <a style={{ textAlign: "center", margin: 20 }}>
              账号：{userName}
            </a>
            <a
              style={{
                textAlign: "center",
                marginBottom: 6,
                marginTop: 6
              }}
            >
              VIP到期时间：{expiredTime}
            </a>

            {!isVIP && (
              <button
                type="button"
                style={{
                  margin: 20,
                  fontStyle: "oblique"
                }}
                onClick={buyVIP}
              >
                开通VIP
              </button>
            )}

            <div style={{ margin: "auto" }}>
              <button
                type="button"
                style={{
                  backgroundColor: "#00000000",
                  color: "#ff0000"
                }}
                onClick={logout}
              >
                退出登陆
              </button>
            </div>
          </div>
        )}

        {!isLogin && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <p>未登陆状态可前往VPN页面开始试用</p>
            <button
              type="button"
              style={{
                width: 110,
                marginBottom: 30
              }}
              onClick={openLogin}
            >
              登陆
            </button>
          </div>
        )}


      </div>
    </BasePage>
  );
};

export default UserPage;

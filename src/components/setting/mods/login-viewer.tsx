import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { BaseDialog, DialogRef, Notice } from "@/components/base";
import { getBaseUrl, openWebUrl, refreshUserInfo } from "@/services/cmds";
import axios from "axios";
import LSUtil from "@/utils/local-storage-util";
import { getData, postData } from "@/utils/net-util";

export const LoginViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [code, setCode] = useState("");
  const [showPopup, setShowPopup] = useState(true);
  const [disableSend, setDisableSend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useImperativeHandle(ref, () => ({
    open: () => {
      const username = LSUtil.getUserName();
      if (username != null) {
        setUsername(username);
      }
      setOpen(true);
      Notice.info("如登陆后没有反应，可以尝试关闭VPN或稍后重试", 3000);
    },
    close: () => setOpen(false),
  }));

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (disableSend) {
      interval = setInterval(() => {
        setCountdown((prevCount) => prevCount - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [disableSend]);

  useEffect(() => {
    if (countdown === 0) {
      setDisableSend(false);
      setCountdown(60);
    }
  }, [countdown]);
  const handleLogin = () => {
    if (username !== "") {
      if (password !== "") {
        Notice.info("正在登陆，请稍后");
        login(username, password, code)
          .then((result) => {
            if (result.msg !== "Bad credentials") {
              if (result.code == 0) {
                // 清空输入框
                setUsername("");
                setPassword("");
                LSUtil.setToken(result.token);
                setOpen(false);
                getInfo()
                  .then(async (result) => {
                    if (result.code == 0) {
                      LSUtil.setExpiredTime(result.data.userInfo.expiredTime);
                      LSUtil.setUserName(result.data.userInfo.userName);
                      LSUtil.setVIP(result.data.userInfo.vip);
                      await refreshUserInfo();
                    } else {
                      Notice.error(result.msg);
                    }
                  })
                  .catch(() => {
                    Notice.error("网络错误，请检查网络后重试");
                  });
              } else {
                Notice.error(result.msg);
              }
            } else {
              Notice.error("用户名或密码错误");
            }
          })
          .catch(() => {});
      } else {
        Notice.error("请输入密码");
      }
    } else {
      Notice.error("请输入用户名");
    }
  };

  async function getInfo(): Promise<any> {
    const baseUrl = await getBaseUrl();
    LSUtil.setBaseUrl(baseUrl);

    try {
      const response = await getData(baseUrl + "/sys/user/sysInfo");
      return response.data; // 返回登录成功后的用户数据
    } catch (error) {
      // @ts-ignore
      Notice.error(error.response.data);
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }

  const sendCode = async () => {
    if (username !== "") {
      Notice.info("正在发送验证码，请稍后", 2000);
      let baseUrl = LSUtil.getBaseUrl();
      if (baseUrl == null) {
        baseUrl = await getBaseUrl();
        if (baseUrl == null) {
          baseUrl = "https://vip.foxovpn.com";
        }
        LSUtil.setBaseUrl(baseUrl);
      }
      try {
        const response = await postData(
          baseUrl +
            "/verification/mail/sendCodeByUserName?username=" +
            username,
          {}
        );
        if (response.data.code === 0) {
          Notice.success("发送成功！");
          setDisableSend(true);
        } else Notice.error(response.data.msg);
        return response.data; // 返回登录成功后的用户数据
      } catch (error) {
        // @ts-ignore
        Notice.error(error.response.data);
        // @ts-ignore
        throw new Error(error.response.data); // 抛出登录失败的错误信息
      }
    } else {
      Notice.error("请输入用户名");
    }
  };

  const register = async () => {
    let baseUrl = LSUtil.getBaseUrl();
    if (baseUrl == null) {
      baseUrl = await getBaseUrl();
      if (baseUrl == null) {
        baseUrl = "https://vip.foxovpn.com";
      }
      LSUtil.setBaseUrl(baseUrl);
    }
    openWebUrl(baseUrl + "/account.html");
  };

  const openForum = async () => {
    openWebUrl("https://v2cross.net");
  };

  async function login(
    username: string,
    password: string,
    vcode: string
  ): Promise<any> {
    try {
      let baseUrl = LSUtil.getBaseUrl();
      if (baseUrl == null) {
        baseUrl = await getBaseUrl();
        if (baseUrl == null) {
          baseUrl = "https://vip.foxovpn.com";
        }
        LSUtil.setBaseUrl(baseUrl);
      }

      const response = await axios.post(
        baseUrl + "/token/login",
        {
          username,
          password,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            vcode: vcode,
          },
        }
      );
      return response.data; // 返回登录成功后的用户数据
    } catch (error) {
      // @ts-ignore
      Notice.error(error.response.data);
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }

  return (
    <BaseDialog
      open={open}
      title={""}
      contentSx={{ width: 500 }}
      disableFooter={true}
      onClose={() => setOpen(false)}
    >
      <div className="login-container">
        <form className="login-form">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="popup">
            <input
              type="text"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={disableSend}
              style={{
                marginLeft: 12,
                backgroundColor: disableSend ? "#999999" : "#5b5c9d",
              }}
            >
              发送验证码
            </button>

            <p
              style={{
                fontSize: 12,
                marginBottom: -5,
              }}
            >
              {disableSend
                ? `已发送验证码到您绑定的邮箱，请等待 ${countdown} 秒后再次发送`
                : "　"}
            </p>
          </div>

          <button type="button" onClick={handleLogin}>
            登陆
          </button>
        </form>

        <button
          type="button"
          style={{
            backgroundColor: "#00000000",
            color: "#5b5c9d",
            marginTop: 10,
          }}
          onClick={register}
        >
          注册账号
        </button>

        <a style={{ fontSize: 12, marginTop: 20, color: "gray" }}>
          软件使用问题请前往
          <a
            style={{ color: "#5b5c9d", cursor: "pointer" }}
            onClick={openForum}
          >
            交流论坛
          </a>
          查看
        </a>
      </div>
    </BaseDialog>
  );
});

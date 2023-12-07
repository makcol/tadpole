import {
  forwardRef,
  useImperativeHandle,
  useState
} from "react";
import { useTranslation } from "react-i18next";
import { BaseDialog, DialogRef, Notice } from "@/components/base";

import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js";
import { useLockFn } from "ahooks";
import Alipay from "@/assets/image/alipay.png";
import Wechat from "@/assets/image/wechat.png";

import {
  getBaseUrl,
  openWebUrl
} from "@/services/cmds";

import LSUtil from "@/utils/local-storage-util";
import { postData } from "@/utils/net-util";
import axios from "axios";

export const BuyViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);


  const createAlipay = useLockFn(async () => {
    Notice.info("正在创建订单，请稍后")
    let baseUrl = LSUtil.getBaseUrl();
    if (baseUrl == null) {
      baseUrl = await getBaseUrl();
      if (baseUrl == null) {
        baseUrl = "https://vip.foxovpn.com";
      }
      LSUtil.setBaseUrl(baseUrl);
    }
    postData(baseUrl + "/order/orders/save", { "comboId": 3, "type": "alipay","application":"TadpoleVPN" }).then(res => {
      if (res.data.payurl != null) {
        openWebUrl(res.data.payurl);
      }
      if (res.data.qrcode != null) {
        openWebUrl(res.data.qrcode);
      }
    }).catch(() => {
      Notice.error("购买失败，请稍后重试");
    });

  });

  const createWechatPay = useLockFn(async () => {
    Notice.info("正在创建订单，请稍后")
    let baseUrl = LSUtil.getBaseUrl();
    if (baseUrl == null) {
      baseUrl = await getBaseUrl();
      if (baseUrl == null) {
        baseUrl = "https://vip.foxovpn.com";
      }
      LSUtil.setBaseUrl(baseUrl);
    }
    postData(baseUrl + "/order/orders/save", { "comboId": 3, "type": "wxpay" ,"application":"TadpoleVPN"}).then(res => {
      if (res.data.payurl != null) {
        openWebUrl(res.data.payurl);
      }
      if (res.data.qrcode != null) {
        openWebUrl(res.data.qrcode);
      }
    }).catch(() => {
      Notice.error("购买失败，请稍后重试");
    });

  });
 const completePay = useLockFn(async () => {
    Notice.info("正在检查订单信息，请稍后")
    let baseUrl = LSUtil.getBaseUrl();
    if (baseUrl == null) {
      baseUrl = await getBaseUrl();
      if (baseUrl == null) {
        baseUrl = "https://vip.foxovpn.com";
      }
      LSUtil.setBaseUrl(baseUrl);
    }

   getInfo()
     .then(async (result) => {

       if (result.code == 0) {
         const expiredTime = result.data.userInfo.expiredTime;
         const userName = result.data.userInfo.userName;
         const vip = result.data.userInfo.vip;

         LSUtil.setExpiredTime(expiredTime);
         LSUtil.setUserName(userName);
         LSUtil.setVIP(vip);

       } else if (result.code == 401) {
         Notice.error("登陆已过期");
         localStorage.removeItem("token");
       }
       setOpen(false)
     })
     .catch(() => {
       setOpen(false)
     });
  });
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
        headers: { token: LSUtil.getToken() }
      });
      return response.data; // 返回登录成功后的用户数据
    } catch (error) {
      // @ts-ignore
      throw new Error(error.response.data); // 抛出登录失败的错误信息
    }
  }


  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
    },
    close: () => setOpen(false)
  }));

  return (
    <BaseDialog
      open={open}
      title={
        <>
          {t("buyTime")}
        </>
      }
      contentSx={{ width: 320, pb: 1, userSelect: "text" }}
      cancelBtn={t("Cancel")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={completePay}
      okBtn={t("paid")}
    >
      <div style={{ width: "100%", height: "50%" }}>

        <h1>￥13.99 / 30天</h1>

        <img src={Alipay} style={{ height: 70, width: 288, borderRadius: 80, cursor: "pointer", marginTop: 20 }}
             alt="支付宝支付" onClick={createAlipay} />

        <img src={Wechat}
             style={{ height: 70, width: 288, borderRadius: 80, cursor: "pointer", marginTop: 20, marginBottom: 20 }}
             alt="微信支付" onClick={createWechatPay} />

      </div>
    </BaseDialog>
  );
});

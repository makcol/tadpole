import {
  forwardRef,
  useImperativeHandle,
  useState
} from "react";
import { useTranslation } from "react-i18next";
import { TextField } from "@mui/material";
import { BaseDialog, DialogRef, Notice } from "@/components/base";

import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js";
import { useLockFn } from "ahooks";
import {
  getAppleTime,
  openWebUrl
} from "@/services/cmds";

import CryptoJS from 'crypto-js';
import LSUtil from "@/utils/local-storage-util";

export const CodeViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");


  const key = CryptoJS.enc.Utf8.parse('82fiQ8rwkdfZ5Ytz');
  const iv = CryptoJS.enc.Utf8.parse('82fiQ8rwkdfZ5Ytz');

  const onOkB = useLockFn(async () => {

    getAppleTime().then((data)=>{

      if (data == null) {
        Notice.error("内部错误");
        return
      }
      const result = decrypt(code)
      const number = parseInt(result, 10);
      const milliseconds = new Date(data).getTime();
      if (milliseconds - number < 3600000) {
        try {
          startTry()
        } catch (err: any) {
          Notice.error(err.message || err.toString());
        }
      } else {
        Notice.error("激活码已过期");
      }
    })

  });

  function startTry(){
    Notice.success("恭喜！您的激活码有效，已开始试用")
    LSUtil.startTryTime();
    setOpen(false);
  }

  function decrypt(word: string) {
    let base64 = CryptoJS.enc.Base64.parse(word);
    let src = CryptoJS.enc.Base64.stringify(base64);

    let decrypt = CryptoJS.AES.decrypt(src, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
    return decryptedStr.toString();
  }


  useImperativeHandle(ref, () => ({
    open: () => {
      openWebUrl("https://v2ce.com/code.html").then(r => setOpen(true))
    },
    close: () => setOpen(false)
  }));

  return (
    <BaseDialog
      open={open}
      title={
        <>
          {t("active_code")}
        </>
      }
      contentSx={{ width: 320, pb: 1, userSelect: "text" }}
      cancelBtn={t("Cancel")}
      okBtn={t("use")}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onOkB}
    >
      <div style={{ width: "100%", height: "80px" }}>
        <TextField
          hiddenLabel
          fullWidth
          size="medium"
          autoComplete="off"
          spellCheck="false"
          variant="outlined"
          placeholder={t("active_code")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
    </BaseDialog>
  );
});

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { Notice } from "@/components/base";
import getSystem from "@/utils/get-system";
import LSUtil from "@/utils/local-storage-util";

const OS = getSystem();

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
    Notice.error("未知系统，暂时无法登陆");
}

axios.interceptors.request.use((config:AxiosRequestConfig)=>{

  // @ts-ignore
  config.headers['token'] = LSUtil.getToken();
  // @ts-ignore
  config.headers['device'] = device;
  // @ts-ignore
  config.headers['application'] = "TadpoleVPN";

  return config;
});

// 封装 GET 请求
export async function getData(url: string): Promise<any> {
  try {
    return await axios.get(url);
  } catch (error) {
    // 处理错误
    console.error('Error fetching data:', error);
    throw error;
  }
}

// 封装 POST 请求
export async function postData(url: string, data: any): Promise<any> {

  try {
    return await axios.post(url, data, {});
  } catch (error) {
    // 处理错误
    console.error('Error posting data:', error);
    throw error;
  }
}

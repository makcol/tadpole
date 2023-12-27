import { Notice } from "@/components/base";

class LSUtil {
  static setToken(token: string) {
    localStorage.setItem("token", token);
  }

  static getToken(): string | null {
    return localStorage.getItem("token");
  }

  static isNeedUpdate(): boolean | null {
    const today: Date = new Date();
    const year: number = today.getFullYear();
    const month: number = today.getMonth() + 1; // 月份是从 0 开始的，所以要加 1
    const day: number = today.getDate();

    const formattedMonth: string = month < 10 ? `0${month}` : `${month}`;
    const formattedDay: string = day < 10 ? `0${day}` : `${day}`;

    const formattedDate: string = `${year}-${formattedMonth}-${formattedDay}`;

    return localStorage.getItem("updateTime") != formattedDate;
  }

  static setNeedUpdate() {
    const today: Date = new Date();
    const year: number = today.getFullYear();
    const month: number = today.getMonth() + 1; // 月份是从 0 开始的，所以要加 1
    const day: number = today.getDate();

    const formattedMonth: string = month < 10 ? `0${month}` : `${month}`;
    const formattedDay: string = day < 10 ? `0${day}` : `${day}`;

    const formattedDate: string = `${year}-${formattedMonth}-${formattedDay}`;

    localStorage.setItem("updateTime", formattedDate);
  }

  static setExpiredTime(expiredTime: string) {
    localStorage.setItem("expiredTime", expiredTime);
  }

  static getExpiredTime(): string | null {
    return localStorage.getItem("expiredTime");
  }

  static setUserName(userName: string) {
    localStorage.setItem("userName", userName);
  }

  static getUserName(): string | null {
    return localStorage.getItem("userName");
  }

  static setVIP(vip: string) {
    localStorage.setItem("vip", vip);
  }

  static isVIP(): boolean {
    return localStorage.getItem("vip") == "true";
  }

  static setBaseUrl(baseUrl: string) {
    localStorage.setItem("baseUrl", baseUrl);
  }

  static getBaseUrl(): string | null {
    return localStorage.getItem("baseUrl");
  }

  static startTryTime() {
    const tryTime = this.getTryTime();
    if (tryTime > Date.now()) {
      Notice.error("您已经开始试用，请在本次试用到期后再来试试");
    } else {
      localStorage.setItem(
        "tryTime",
        JSON.stringify(Date.now() + 60 * 60 * 1000)
      );
    }
  }

  static getTryTime(): number {
    if (this.isVIP()) {
      return 9999999999999;
    }
    const tryTime: string | null = localStorage.getItem("tryTime");
    if (tryTime) {
      return JSON.parse(tryTime);
    } else return 0;
  }

  static clear() {
    const userName = this.getUserName();
    const baseUrl = this.getBaseUrl();
    const tryTime: string | null = localStorage.getItem("tryTime");
    localStorage.clear();
    if (tryTime) {
      localStorage.setItem("tryTime", JSON.stringify(tryTime));
    }
    if (userName) {
      this.setUserName(userName);
    }
    if (baseUrl) {
      this.setBaseUrl(baseUrl);
    }
  }
}

export default LSUtil;

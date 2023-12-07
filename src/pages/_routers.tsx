import LogsPage from "./logs";
import ProxiesPage from "./proxies";
import ProfilesPage from "./profiles";
import SettingsPage from "./settings";
import ConnectionsPage from "./connections";
import RulesPage from "./rules";
import UserPage from "@/pages/_user";

export const routers = [

  {
    label: "Label-User",
    link: "/",
    ele: UserPage
  },
  {
    label: "Label-Profiles",
    link: "/profiles",
    ele: ProfilesPage
  },
  {
    label: "Label-Proxies",
    link: "/proxies",
    ele: ProxiesPage
  },
  {
    label: "Label-Settings",
    link: "/settings",
    ele: SettingsPage
  }
  // , {
  //   label: "Label-Logs",
  //   link: "/logs",
  //   ele: LogsPage
  // }
];

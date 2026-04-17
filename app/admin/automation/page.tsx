import { AutomationClient } from "./automation-client"

export const metadata = {
  title: "Automation | IPOGyani Admin",
  description: "Scraper health, recent runs, and data quality monitoring.",
}

export default function AutomationPage() {
  return <AutomationClient />
}

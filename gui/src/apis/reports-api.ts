import { authApiHelper } from "./api-helper";

export type ReportMetadata = {
  reportName: string;
  intersectionID: number;
  roadRegulatorID: string;
  reportGeneratedAt: Date;
  reportStartTime: Date;
  reportStopTime: Date;
  reportContents: string[];
}

class ReportsApi {
  async generateReport({
    token,
    intersection_id,
    startTime,
    endTime,
  }: {
    token: string;
    intersection_id: number;
    startTime: Date;
    endTime: Date;
  }): Promise<Blob | undefined> {
    const queryParams: Record<string, string> = {};
    queryParams["intersection_id"] = intersection_id.toString();
    if (startTime) queryParams["start_time_utc_millis"] = startTime.getTime().toString();
    if (endTime) queryParams["end_time_utc_millis"] = endTime.getTime().toString();

    const pdfReport = await authApiHelper.invokeApi({
      path: `/reports/generate`,
      token: token,
      responseType: "blob",
      queryParams,
      failureMessage: "Failed to generate PDF report",
    });

    return pdfReport;
  }

  async listReports({
    token,
    intersection_id,
    startTime,
    endTime,
  }: {
    token: string;
    intersection_id: number;
    startTime: Date;
    endTime: Date;
  }): Promise<ReportMetadata[] | undefined> {
    const queryParams: Record<string, string> = {};
    queryParams["intersection_id"] = intersection_id.toString();
    queryParams["start_time_utc_millis"] = startTime.getTime().toString();
    queryParams["end_time_utc_millis"] = endTime.getTime().toString();
    queryParams["latest"] = "false";

    const pdfReport = await authApiHelper.invokeApi({
      path: `/reports/list`,
      token: token,
      queryParams,
      failureMessage: "Failed to list PDF reports",
    });

    return pdfReport;
  }

  async downloadReport({
    token,
    reportName,
  }: {
    token: string;
    reportName: string;
  }): Promise<Blob | undefined> {
    const queryParams: Record<string, string> = {};
    queryParams["report_name"] = reportName;

    const pdfReport = await authApiHelper.invokeApi({
      path: `/reports/download`,
      token: token,
      responseType: "blob",
      queryParams,
      failureMessage: `Failed to download PDF report ${reportName}`,
    });

    return pdfReport;
  }
}

export default new ReportsApi();

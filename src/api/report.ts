import { apiClient } from "./client";

export type ReportRequest = {
  sessionId: number;
  reportedUserId: number;
  reason?: string;
};

export type ReportResponse = {
  success: boolean;
  message?: string;
};

/**
 * 신고하기
 * POST /reports
 */
export async function reportUser(
  sessionId: number,
  reportedUserId: number,
  reason?: string
) {
  const { data } = await apiClient.post<ReportResponse>("/reports", {
    sessionId,
    reportedUserId,
    reason,
  } as ReportRequest);
  return data;
}

export type ApiErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string>;
  requestId?: string;
}

export interface ApiMeta {
  requestId: string;
  generatedAt: string;
  synthetic: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
  error: null;
}

export interface ApiFailure {
  data: null;
  meta: ApiMeta;
  error: ApiError;
}

export type ApiResult<T> = ApiResponse<T> | ApiFailure;

export interface PaginatedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  purpose: string;
  roles: Array<"government" | "citizen">;
};

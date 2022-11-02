export default interface IDownload {
  id: string;
  path: string;
  suggestedFilename: string;
  url: string;
}

export interface IDownloadState {
  id: string;
  totalBytes: number;
  complete: boolean;
  progress: number;
  canceled: boolean;
}

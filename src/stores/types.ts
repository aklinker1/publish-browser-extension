export interface PublishSuccess {
  success: true;
}
export interface PublishFailure {
  success: false;
  err: any;
}
export type PublishResult = PublishSuccess | PublishFailure;

export interface IStore {
  publish(): Promise<void>;
  name: string;
}

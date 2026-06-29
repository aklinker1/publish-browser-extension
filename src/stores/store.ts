export interface SubmitSuccess {
  success: true;
}
export interface SubmitFailure {
  success: false;
  err: any;
}
export type SubmitResult = SubmitSuccess | SubmitFailure;

export interface Store {
  /**
   * Submit the ZIP file to the store.
   */
  submit(dryRun: boolean): Promise<void>;
  /**
   * Throw an error if the provided files do not exist.
   */
  ensureZipsExist(): Promise<void>;
}

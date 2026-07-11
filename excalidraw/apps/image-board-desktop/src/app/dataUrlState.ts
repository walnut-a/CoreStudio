export const extractBase64DataUrlPayload = (dataUrl: string) => {
  const payloadStart = dataUrl.indexOf(",");
  return payloadStart === -1 ? "" : dataUrl.slice(payloadStart + 1);
};

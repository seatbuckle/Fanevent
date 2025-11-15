// server/lib/attendance.js
export const canCheckIn = (startAt, now = new Date()) =>
  now.getTime() >= new Date(startAt).getTime() - 30 * 60 * 1000;

export const computeHours = (start, end) => {
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  return +(ms / 3600000).toFixed(2);
};

export type UserType = {
  id: number;
  ionId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  classYear: string | null;
  roles: string[];
  position: string | null;
};

export type AttendanceRecordType = {
  id: number;
  timestamp: string;
  user: { id: number; name: string | null; username: string | null; classYear: string | null };
};

export type AttendanceBlockType = {
  id: number;
  blockType: string;
  date: string;
  code: string;
  isClosed: boolean;
  createdAt: string;
  records: AttendanceRecordType[];
};

export type TeamType = {
  id: number;
  name: string;
  arcId: string | null;
};

export type TeamMemberType = {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  name: string | null;
  username: string | null;
};

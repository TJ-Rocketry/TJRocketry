export type UserType = {
  id: number;
  ionId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  classYear: string | null;
  roles: string[];
};

export type AttendanceBlockType = {
  id: number;
  blockType: string;
  date: string;
  code: string;
  createdAt: string;
  _count?: { records: number };
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

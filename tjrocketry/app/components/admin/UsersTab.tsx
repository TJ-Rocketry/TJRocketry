"use client";
import { UserType } from "./types";

const ROLES = ["admin", "sponsor", "officer", "ARCmember", "BOTRmember", "user"];

export default function UsersTab({
  users,
  onRoleToggle,
}: {
  users: UserType[];
  onRoleToggle: (userId: number, role: string, currentRoles: string[]) => void;
}) {
  return (
    <div className="border border-neutral-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="p-3 text-xs text-gray-400 font-medium">ID</th>
              <th className="p-3 text-xs text-gray-400 font-medium">Name</th>
              <th className="p-3 text-xs text-gray-400 font-medium">Email</th>
              <th className="p-3 text-xs text-gray-400 font-medium">Roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <span className="text-sm text-gray-400">#{u.id}</span>
                  <span className="text-xs text-gray-600 ml-1">{u.ionId}</span>
                </td>
                <td className="p-3">
                  <div className="text-sm">{u.name || "N/A"}</div>
                  <div className="text-xs text-gray-500">{u.username || "N/A"}</div>
                </td>
                <td className="p-3 text-sm text-gray-400">{u.email || "N/A"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {ROLES.map(role => {
                      const active = u.roles.includes(role);
                      return (
                        <button key={role}
                          onClick={() => onRoleToggle(u.id, role, u.roles)}
                          className={`px-2 py-0.5 text-xs border ${active ? "border-white text-white" : "border-neutral-600 text-gray-500"}`}>
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

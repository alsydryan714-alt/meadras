import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MOE_LOGO = `${import.meta.env.BASE_URL}moe-header.jpg`;

interface SchoolInfo {
  name: string;
  principalName: string;
  logoUrl: string;
  educationRegion: string;
}

export function PrintHeader({ title }: { title?: string }) {
  const { user } = useAuth();
  const [school, setSchool] = useState<SchoolInfo | null>(null);

  useEffect(() => {
    if (!user?.schoolId) return;
    fetch(`${BASE}/api/schools/${user.schoolId}/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d?.name !== undefined) {
          setSchool({
            name: d.name || "",
            principalName: d.principalName || "",
            logoUrl: d.logoUrl || "",
            educationRegion: d.educationRegion || "",
          });
        }
      })
      .catch(() => {});
  }, [user?.schoolId]);

  const hijriDate = (() => {
    try {
      return new Date().toLocaleDateString("ar-SA-u-ca-islamic", {
        year: "numeric", month: "long", day: "numeric"
      });
    } catch { return ""; }
  })();
  const gregorianDate = new Date().toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="border-b-2 border-black pb-4 mb-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">

        {/* Ministry of Education logo — Right */}
        <div className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 110 }}>
          <img
            src={MOE_LOGO}
            alt="وزارة التعليم"
            style={{ width: 100, height: "auto", objectFit: "contain" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="text-[10px] font-bold text-gray-600 text-center">المملكة العربية السعودية</span>
        </div>

        {/* Center info */}
        <div className="flex-1 text-center">
          {school?.educationRegion && (
            <p className="text-xs text-gray-500 mb-0.5">إدارة تعليم {school.educationRegion}</p>
          )}
          <h1 className="text-xl font-black text-gray-900 leading-tight">{school?.name || "المدرسة"}</h1>
          {title && (
            <h2 className="text-base font-bold text-gray-700 mt-1 border-t border-gray-200 pt-1">{title}</h2>
          )}
          {school?.principalName && (
            <p className="text-xs text-gray-700 mt-1.5">
              <span className="font-bold">مدير المدرسة: </span>{school.principalName}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-1">
            {hijriDate && `${hijriDate} هـ`}
            {hijriDate && gregorianDate && " | "}
            {gregorianDate && `${gregorianDate} م`}
          </p>
        </div>

        {/* School Logo — Left */}
        <div className="flex flex-col items-center shrink-0" style={{ minWidth: 100 }}>
          {school?.logoUrl ? (
            <img
              src={school.logoUrl}
              alt="شعار المدرسة"
              style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }}
            />
          ) : (
            <div
              style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #ccc",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#aaa", fontSize: 10, textAlign: "center", padding: 4 }}
            >
              شعار المدرسة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

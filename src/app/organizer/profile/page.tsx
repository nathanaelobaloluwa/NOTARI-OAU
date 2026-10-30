import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Mail, Phone, Globe, ShieldCheck } from "lucide-react";

export default function OrganizerProfilePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Organization Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official details displayed to students and verified by superadmins.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl">
              CO
            </div>
            <div>
              <h3 className="font-bold text-notari-dark text-lg">Tech Innovation Club OAU</h3>
              <p className="text-xs text-slate-500">Department of Computer Science • Faculty of Science</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Approved Organizer</span>
          </span>
        </div>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Organization Name</label>
            <Input defaultValue="Tech Innovation Club OAU" icon={<Building className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Official Email</label>
              <Input defaultValue="techclub@oau.edu.ng" icon={<Mail className="w-4 h-4" />} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
              <Input defaultValue="+234 803 123 4567" icon={<Phone className="w-4 h-4" />} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Public About & Mission</label>
            <textarea
              rows={3}
              defaultValue="Fostering student developers, designers, and tech innovators at Obafemi Awolowo University."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-notari-dark focus:outline-none focus:ring-2 focus:ring-purple-600/20"
            />
          </div>

          <div className="pt-2">
            <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-semibold px-6">
              Update Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { PageWrapper } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetClasses, useCreateClass, useDeleteClass } from "@workspace/api-client-react";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type ClassFormData = {
  grade: string;
  section: string;
};

export default function ClassesPage() {
  const { data: classes } = useGetClasses();
  const { mutate: createClass, isPending: isCreating } = useCreateClass();
  const { mutate: deleteClass } = useDeleteClass();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<ClassFormData>();

  const onSubmit = (data: ClassFormData) => {
    createClass({ data }, {
      onSuccess: () => {
        setIsOpen(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
        toast({ title: "تم", description: "تم إضافة الفصل بنجاح" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("تأكيد الحذف؟")) {
      deleteClass({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
        }
      });
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">بيانات الفصول</h1>
            <p className="text-muted-foreground mt-1">الصفوف الدراسية والشعب</p>
          </div>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5 ml-2" /> إضافة فصل
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes?.map(c => (
            <Card key={c.id} className="p-6 rounded-2xl border-none shadow-lg shadow-black/5 flex justify-between items-center bg-white group hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">الصف {c.grade}</p>
                  <h3 className="text-xl font-bold text-foreground">الشعبة {c.section}</h3>
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-5 h-5" />
              </button>
            </Card>
          ))}
          {(!classes || classes.length === 0) && (
            <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد فصول مسجلة</div>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">إضافة فصل جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-bold mb-2">الصف</label>
                <input 
                  {...register("grade", { required: true })} 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="مثال: الأول المتوسط"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الشعبة</label>
                <input 
                  {...register("section", { required: true })} 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                  placeholder="مثال: أ أو 1"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">إلغاء</Button>
                <Button type="submit" disabled={isCreating} className="rounded-xl shadow-lg shadow-primary/20 px-8">حفظ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}

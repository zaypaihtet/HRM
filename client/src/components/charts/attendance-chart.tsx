import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface AttendanceData {
  day: string;
  percentage: number;
}

const weeklyData: AttendanceData[] = [
  { day: "Monday", percentage: 92 },
  { day: "Tuesday", percentage: 89 },
  { day: "Wednesday", percentage: 95 },
  { day: "Thursday", percentage: 88 },
  { day: "Friday", percentage: 75 },
];

export default function AttendanceChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
        <Select defaultValue="week">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyData.map((data) => (
          <div key={data.day} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground min-w-[80px]">{data.day}</span>
            <div className="flex items-center space-x-2 flex-1">
              <Progress value={data.percentage} className="flex-1 max-w-32" />
              <span className="text-sm font-medium text-gray-800 min-w-[40px] text-right">
                {data.percentage}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

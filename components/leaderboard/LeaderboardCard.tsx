import { ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface LeaderboardCardProps {
  title: string;
  description: string;
  href: string;
  icon?: string;
  children?: ReactNode;
}

export default function LeaderboardCard({
  title,
  description,
  href,
  icon,
  children,
}: LeaderboardCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}

        <Button variant="link" asChild className="w-full justify-between p-0 h-auto">
          <Link href={href}>
            Zobrazit vše
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

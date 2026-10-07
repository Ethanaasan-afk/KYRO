import type { Metadata } from "next";
import { APP_NAME, LEGAL_ENTITY_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description:
    `Contact ${LEGAL_ENTITY_NAME} about ${APP_NAME} sales and support.`,
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

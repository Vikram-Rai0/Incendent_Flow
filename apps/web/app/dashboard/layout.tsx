// Wraps all /incidents/* pages
// Redirects to login if not authenticated

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/ui/Navbar";
import { Sidebar, MobileNav } from "@/components/ui/Sidebar";

export default function IncidentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If the user is not logged in, send them to login.
        // replace() keeps /incidents out of history, so Back doesn't loop.
        if (!isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, router]);

    // While redirecting, show nothing
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#0a0d13] text-[#e6e9ef]">
            <Navbar />
            <MobileNav />
            <div className="flex">
                <Sidebar />
                <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
                    {children}
                </main>
            </div>
        </div>
    );
}
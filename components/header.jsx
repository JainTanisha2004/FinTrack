// import React from "react";
import { Button } from "./ui/button";
// import { PenBox, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
// import { checkUser } from "@/lib/checkUser";
import { LayoutDashboard, PenBox, Sparkles, TrendingUp } from "lucide-react";
import { checkUser } from "@/lib/checkUser";

const Header = async () => {

  await checkUser();
  
  return (
    <div className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
       <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="text-2xl font-bold tracking-tight text-blue-950">
            Fin<span className="text-blue-600">track</span>
          </span>
        </Link>

      <div className="flex items-center space-x-6">

        <SignedIn>
          <Link href={"/dashboard"} className="text-gray-600 hover:text-blue-600 flex items-center gap-2">
            <Button variant="outline">
              <LayoutDashboard size={18}/>
              <span className="hidden md:inline">Dashboard</span>
            </Button>
          </Link>

          <Link href={"/ai-advisor"}>
            <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 flex items-center gap-2">
              <Sparkles size={18}/>
              <span className="hidden md:inline">AI Advisor</span>
            </Button>
          </Link>

          <Link href={"/forecast"}>
            <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center gap-2">
              <TrendingUp size={18}/>
              <span className="hidden md:inline">Forecast</span>
            </Button>
          </Link>

          <Link href={"/transaction/create"}>
            <Button className="flex items-center gap-2">
              <PenBox size={18}/>
              <span className="hidden md:inline">Add Transaction</span>
            </Button>
          </Link>

        </SignedIn>

        <SignedOut>
        <SignInButton forceRedirectUrl={"/dashboard"}>
        <Button variant="outline">Login</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton appearance={{
          elements:{
            avatarBox:"w-10 h-10"
          }
        }}/>
      </SignedIn>
      </div>  
      
    </nav>
    </div>
  );
};

export default Header;

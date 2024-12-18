'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Clipboard, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

export default function LoginInfo() {
  const [copiedStates, setCopiedStates] = useState({
    username: false,
    password: false
  });

  const handleCopy = async (text: string, field: 'username' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [field]: true }));

    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [field]: false }));
    }, 2000);
  };

  return (
    <Popover>
      <PopoverTrigger><Info className={'w-5 h-5 ml-2'} /></PopoverTrigger>
      <PopoverContent className="w-[400px] p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Demo User Info:</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleCopy('test+clerk_test@ticketr.com', 'username')}
              className="w-full text-left"
            >
              {copiedStates.username ? (
                <div className="flex items-center gap-2 text-green-500 py-2">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="text-xs">Copied Username!</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-sm group">
                  <div className="w-24 text-gray-500">username:</div>
                  <div className="text-gray-800">test+clerk_test@ticketr.com</div>
                  <Clipboard className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </button>
            <button
              onClick={() => handleCopy('Ticketr1234@', 'password')}
              className="w-full text-left"
            >
              {copiedStates.password ? (
                <div className="flex items-center gap-2 text-green-500 py-2">
                  <ClipboardCheck className="w-4 h-4" />
                  <span className="text-xs">Copied Password!</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-sm group">
                  <div className="w-24 text-gray-500">password:</div>
                  <div className="text-gray-800">Ticketr1234@</div>
                  <Clipboard className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
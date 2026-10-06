import { createFileRoute, redirect } from '@tanstack/react-router';
export const Route=createFileRoute('/watchbox')({beforeLoad:()=>{throw redirect({to:'/profile'})}});

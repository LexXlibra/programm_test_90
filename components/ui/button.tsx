import type { ButtonHTMLAttributes } from "react";

type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"default"|"outline"|"ghost"};

export function Button({variant="default",type="button",className="",...props}:ButtonProps){
  return <button data-slot="button" data-variant={variant} type={type} className={className} {...props}/>;
}

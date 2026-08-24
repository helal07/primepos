import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string | ((props: { isActive: boolean; isPending: boolean; isTransitioning: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={(state) =>
          cn(
            typeof className === "function" ? className(state as any) : className,
            state.isActive && activeClassName,
            state.isPending && pendingClassName,
          )
        }
        {...props}
      />
    );
  },
);


NavLink.displayName = "NavLink";

export { NavLink };

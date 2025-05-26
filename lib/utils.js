import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// The cn function you see used in React projects usually stands for "classNames"
// or a similar utility that helps with conditionally combining CSS class names.

// Why use cn?

// Instead of writing something like this:
// className={"btn " + (isActive ? "btn-active" : "") + " mt-4"}
// You can write:
// className={cn("btn", isActive && "btn-active", "mt-4")}
// It makes the code cleaner and easier to read.

// Prevents mistakes from accidentally adding false or undefined classes.
// When adding CSS classes manually:
// Imagine you write:
// const isActive = false;
// const className = "btn " + (isActive && "active");
// console.log(className);
// Output will be:
// "btn false"

// How cn helps:
// With cn:
// const isActive = false;
// const className = cn("btn", isActive && "active");
// console.log(className);
// Output will be:
// "btn"

// cn ignores any falsey value like false, null, or undefined, so it doesn’t add invalid or unwanted classes.
// Without cn, your class string can accidentally include "false" or "undefined", causing styling bugs.
// cn prevents this by only including valid class names.
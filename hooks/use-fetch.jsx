import { useState } from "react";
import { toast } from "sonner";

// This useFetch is a custom React hook that helps you fetch data easily and safely — with built-in support for:
// ✅ tracking loading state
// ✅ handling error
// ✅ showing a toast notification if there's an error
// ✅ storing the response data

// Custom hook that takes a callback (usually an API call)
const useFetch = (cb) => {
    // Step 1: Create a piece of state to **store fetched data**
    // 👉 When the API gives us some information, we will save it here.
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  // Step 2: This function will run when we want to fetch something
  const fn = async (...args) => {
    setLoading(true);
    setError(null);

    try {
        // Try to call the given function (like an API request)
        // Step 3: Call the API or function passed from outside
      const response = await cb(...args);
      // Step 4: Save the successful response into "data"
      setData(response);
      setError(null);
    } catch (error) {
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Give back "data" to whoever uses this hook
  return { data, loading, error, fn, setData };
};

export default useFetch;
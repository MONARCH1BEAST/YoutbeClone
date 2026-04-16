import SearchResult from "@/components/SearchResult";
import { useRouter } from "next/router";
import React, { Suspense } from "react";

const index = () => {
  const router = useRouter();
  const { q } = router.query;
  const queryText = Array.isArray(q) ? q[0] || "" : q || "";
  return (
    <div className="flex-1 p-4">
      <div className="max-w-6xl">
        {queryText && (
          <div className="mb-6">
            <h1 className="text-xl font-medium mb-4">
              Search results for "{queryText}"
            </h1>
          </div>
        )}
        <Suspense fallback={<div>Loading search results...</div>}>
          <SearchResult query={queryText} />
        </Suspense>
      </div>
    </div>
  );
};

export default index;

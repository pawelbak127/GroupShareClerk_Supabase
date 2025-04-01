export default function LoadingSpinner() {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Ładowanie...</span>
      </div>
    );
  }
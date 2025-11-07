const LoadingSpinner = () => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-70 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-light-blue border-t-primary-blue rounded-full animate-spin"></div>
        <p className="mt-4 text-medium-grey font-medium">Loading data...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

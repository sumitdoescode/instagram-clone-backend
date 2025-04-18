// this will be a middleware function
const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Something went wrong",
            });
        }
    };
};

export default asyncHandler;

// utils/response.js
const respond = (res, statusCode, success, message, data = null, meta = null) => {
  const body = { success, message };
  if (data  !== null) body.data = data;
  if (meta  !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};





module.exports = {
  ok:         (res, data, message = 'Success',       meta)  => respond(res, 200, true,  message, data, meta),
  created:    (res, data, message = 'Created',       meta)  => respond(res, 201, true,  message, data, meta),
  noContent:  (res, message = 'Deleted')                    => res.status(204).end(),
  badRequest: (res, message = 'Bad request')                => respond(res, 400, false, message),
  unauthorized:(res, message = 'Unauthorized')              => respond(res, 401, false, message),
  forbidden:  (res, message = 'Forbidden')                  => respond(res, 403, false, message),
  notFound:   (res, message = 'Not found')                  => respond(res, 404, false, message),
  conflict:   (res, message = 'Conflict')                   => respond(res, 409, false, message),
  serverError:(res, message = 'Internal server error')      => respond(res, 500, false, message),
};
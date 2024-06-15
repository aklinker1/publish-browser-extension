import { createFetch } from 'ofetch';

export const fetch = createFetch({
  defaults: {
    onResponseError: ctx => {
      console.log('Request:', ctx.request);
      console.log('Response:', JSON.stringify(ctx.response, null, 2));
    },
  },
});

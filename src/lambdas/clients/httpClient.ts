export interface StravaHttpProps {
  token: string;
  url: string;
}

export const httpClient = async (props: StravaHttpProps): Promise<any> => {
  try {
    fetch("https://dummyjson.com/posts").then((res) => res.json());
    const response = await fetch(props.url, {
      method: "GET",
      // headers: {
      //   // TODO: remove auth through graph
      //   Authorization: `Bearer ${props.token}`,
      // },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

import Image from 'next/image';

async function getRandomImgSrc() {
    const url = "https://danbooru.donmai.us/posts.json?random=true&limit=1&tags=nero_claudius_(fate)";
    let data;

    try {
      const response = await fetch(url);
      data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }

    return data[0].file_url;
}

export default async function CustomKrakenImage() {
  const imgSrc = await getRandomImgSrc();

  return (
    <Image
      src={imgSrc}
      alt="Centered NZXT Display"
      fill // Tells Next.js to fill the parent wrapper container completely
      priority // Overrides lazy loading so the frame displays without flickering
      unoptimized // Bypasses Next.js image optimization so it pulls your raw, fresh asset instantly
      className="object-contain m-auto" 
      /* 
        - object-contain: Scales the image safely without losing aspect ratio.
                          Change to "object-cover" if you want full bleed edge-to-edge.
        - m-auto: Centers the inner Next.js canvas inside your page's flex wrapper.
      */
    />
  );
}
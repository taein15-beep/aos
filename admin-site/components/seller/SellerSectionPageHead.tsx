type SellerSectionPageHeadProps = {
  title: string;
  description?: string;
};

export function SellerSectionPageHead({ title, description }: SellerSectionPageHeadProps) {
  return (
    <section className="page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </section>
  );
}
